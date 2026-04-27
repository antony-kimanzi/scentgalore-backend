import { PrismaClient } from "@prisma/client";
import axios from "axios";
import appConfig from "../config/appConfig.js";

const prisma = new PrismaClient();

// Get access token
const getAccessToken = async () => {
  try {
    const auth = Buffer.from(
      `${appConfig.credentials.consumerKey}:${appConfig.credentials.consumerSecret}`,
    ).toString("base64");

    const response = await axios.get(appConfig.authURL, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });
    return response.data.access_token;
  } catch (error) {
    console.error(
      "Error getting access token:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

// Generate timestamp and password
const generatePassword = () => {
  const timestamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, -3);
  const password = Buffer.from(
    `${appConfig.credentials.businessShortCode}${appConfig.credentials.passkey}${timestamp}`,
  ).toString("base64");
  return { timestamp, password };
};

export const paymentController = {
  async initiatePayment(req, res) {
    try {
      console.log("STK Push request received:", req.body);
      const userId = req.userId;

      const { phone, amount, orderId } = req.validatedData;

      if (!phone || !amount || !orderId) {
        return res.status(400).json({
          success: false,
          message: "Phone number, amount, and order ID are required",
        });
      }

      // Verify order exists and belongs to user
      const order = await prisma.order.findUnique({
        where: {
          id: parseInt(orderId),
          userId: userId,
        },
        include: {
          payment: true,
        },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found or unauthorized",
        });
      }

      // Check if order already has a successful payment
      if (order.isPaid) {
        return res.status(400).json({
          success: false,
          message: "Order already paid",
        });
      }

      // Check if order already has a pending payment in Payment table
      if (order.payment) {
        return res.status(400).json({
          success: false,
          message: "Payment already initiated for this order",
          checkoutRequestID: order.payment.checkoutRequestID,
        });
      }

      // Check if order is in pending payment status
      if (order.status !== "pending_payment") {
        return res.status(400).json({
          success: false,
          message: "Order is not in pending payment status",
        });
      }

      const accessToken = await getAccessToken();
      const { timestamp, password } = generatePassword();

      // Format phone number
      const formattedPhone = phone.startsWith("0")
        ? `254${phone.slice(1)}`
        : phone.startsWith("+")
          ? phone.slice(1)
          : phone;

      console.log("M-Pesa Configuration:", {
        businessShortCode: appConfig.credentials.businessShortCode,
        timestamp,
        formattedPhone,
        amount,
        callbackURL: `${appConfig.baseURL}/api/payment/callback`,
      });

      const stkPushPayload = {
        BusinessShortCode: appConfig.credentials.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: formattedPhone,
        PartyB: appConfig.credentials.businessShortCode,
        PhoneNumber: formattedPhone,
        CallBackURL: `${appConfig.baseURL}/api/payment/callback`,
        AccountReference: "ScentGalore",
        TransactionDesc: `Payment for order ${orderId}`,
      };

      console.log("Sending STK Push to M-Pesa with payload:", stkPushPayload);

      try {
        const response = await axios.post(
          appConfig.stkPushURL,
          stkPushPayload,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            timeout: 10000,
          },
        );

        console.log("M-Pesa Response Status:", response.status);
        console.log("M-Pesa Response Data:", response.data);

        // Check if response is HTML instead of JSON
        if (
          typeof response.data === "string" &&
          response.data.includes("<html>")
        ) {
          console.error("M-Pesa returned HTML instead of JSON");

          return res.status(500).json({
            success: false,
            message:
              "M-Pesa API authentication failed. Please check your credentials.",
            error: "HTML response received from M-Pesa API",
          });
        }

        if (response.data.ResponseCode === "0") {
          const checkoutRequestID = response.data.CheckoutRequestID;

          // Create payment record in the Payment table
          const payment = await prisma.payment.create({
            data: {
              orderId: parseInt(orderId),
              checkoutRequestID: checkoutRequestID,
              paymentPhone: formattedPhone,
              paymentAmount: parseFloat(amount),
              paymentStatus: "pending",
              transactionType: "M-Pesa",
            },
          });

          res.json({
            success: true,
            message: "STK push sent successfully. Check your phone.",
            checkoutRequestID: checkoutRequestID,
            orderId: orderId,
            paymentId: payment.id,
            data: response.data,
          });
        } else {
          res.status(400).json({
            success: false,
            message: "Failed to initiate payment",
            error: response.data,
          });
        }
      } catch (axiosError) {
        console.error("Axios STK Push error:", axiosError);

        let errorMessage = "Failed to initiate STK push";
        let errorDetails = axiosError.message;

        if (axiosError.response) {
          errorMessage = `M-Pesa API returned ${axiosError.response.status}`;
          errorDetails = axiosError.response.data;

          if (
            typeof axiosError.response.data === "string" &&
            axiosError.response.data.includes("<html>")
          ) {
            errorMessage = "M-Pesa authentication failed (HTML response)";
          }
        } else if (axiosError.request) {
          errorMessage = "No response from M-Pesa API";
        }

        res.status(500).json({
          success: false,
          message: errorMessage,
          error: errorDetails,
        });
      }
    } catch (error) {
      console.error("STK Push error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to initiate STK push",
        error: error.message,
      });
    }
  },

  async handleCallback(req, res) {
    console.log("💰 M-Pesa Callback Received - Raw request:");

    // Log the complete request
    console.log("Callback request details:", {
      method: req.method,
      url: req.url,
      headers: req.headers,
      contentType: req.headers["content-type"],
      bodyType: typeof req.body,
      body: req.body,
    });

    try {
      let callbackData = req.body;

      // Check if body is a string (malformed from M-Pesa)
      if (typeof callbackData === "string") {
        console.log("⚠️ Body is string, not object. Raw:", callbackData);

        // Try to parse it as JSON
        try {
          callbackData = JSON.parse(callbackData);
          console.log("✅ Successfully parsed string as JSON");
        } catch (parseError) {
          console.log("❌ Could not parse as JSON:", parseError.message);

          // Check if it looks like a CheckoutRequestID
          if (callbackData && callbackData.trim().startsWith("ws_CO_")) {
            console.log("✅ Detected CheckoutRequestID string:", callbackData);
            // Create minimal callback structure
            callbackData = {
              CheckoutRequestID: callbackData.trim(),
            };
          } else {
            console.log("❌ Unknown callback format");
            // Still return success to M-Pesa
            return res
              .status(200)
              .json({ ResultCode: 0, ResultDesc: "Success" });
          }
        }
      }

      // Handle empty callback
      if (!callbackData || Object.keys(callbackData).length === 0) {
        console.log("⚠️ Empty callback data received");
        return res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
      }

      console.log(
        "Parsed callback data:",
        JSON.stringify(callbackData, null, 2),
      );

      let stkCallback;
      let checkoutRequestID;
      let resultCode;
      let resultDesc;

      // Parse callback data - handle different formats
      if (callbackData.Body && callbackData.Body.stkCallback) {
        stkCallback = callbackData.Body.stkCallback;
        checkoutRequestID = stkCallback.CheckoutRequestID;
        resultCode = stkCallback.ResultCode;
        resultDesc = stkCallback.ResultDesc;
      } else if (callbackData.stkCallback) {
        stkCallback = callbackData.stkCallback;
        checkoutRequestID = stkCallback.CheckoutRequestID;
        resultCode = stkCallback.ResultCode;
        resultDesc = stkCallback.ResultDesc;
      } else if (callbackData.CheckoutRequestID) {
        // Direct CheckoutRequestID format
        checkoutRequestID = callbackData.CheckoutRequestID;
        resultCode = callbackData.ResultCode || "0"; // Assume success if not specified
        resultDesc = callbackData.ResultDesc || "Success";
        stkCallback = callbackData;
      } else {
        console.error("❌ Unknown callback format:", callbackData);
        return res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
      }

      if (!checkoutRequestID) {
        console.error("❌ No CheckoutRequestID in callback");
        return res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
      }

      console.log("Extracted callback data:", {
        checkoutRequestID,
        resultCode,
        resultDesc,
        hasStkCallback: !!stkCallback,
      });

      // Find payment by checkoutRequestID
      const payment = await prisma.payment.findUnique({
        where: { checkoutRequestID: checkoutRequestID },
        include: {
          order: true,
        },
      });

      if (!payment) {
        console.error(
          `❌ Payment not found for checkoutRequestID: ${checkoutRequestID}`,
        );
        return res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
      }

      console.log(
        `📊 Found payment ${payment.id} for order ${payment.orderId}`,
      );

      // Convert resultCode to string for comparison
      const resultCodeStr = resultCode ? resultCode.toString() : "0";

      // Check if payment is successful (resultCode 0)
      if (resultCodeStr === "0") {
        console.log("✅ Payment Successful!");

        // Extract payment details from callback metadata
        let callbackMetadata = [];
        let mpesaReceipt = null;
        let amount = null;
        let phone = null;
        let transactionDate = null;

        if (stkCallback && stkCallback.CallbackMetadata) {
          if (stkCallback.CallbackMetadata.Item) {
            callbackMetadata = Array.isArray(stkCallback.CallbackMetadata.Item)
              ? stkCallback.CallbackMetadata.Item
              : [stkCallback.CallbackMetadata.Item];
          } else if (Array.isArray(stkCallback.CallbackMetadata)) {
            callbackMetadata = stkCallback.CallbackMetadata;
          }

          console.log("Callback metadata items:", callbackMetadata.length);

          // Extract values
          for (const item of callbackMetadata) {
            if (item.Name === "Amount" && item.Value) {
              amount = item.Value;
            } else if (item.Name === "MpesaReceiptNumber" && item.Value) {
              mpesaReceipt = item.Value.toString();
            } else if (item.Name === "PhoneNumber" && item.Value) {
              phone = item.Value.toString();
            } else if (item.Name === "TransactionDate" && item.Value) {
              transactionDate = item.Value.toString();
            }
          }
        }

        console.log("Payment Details Extracted:", {
          amount,
          mpesaReceipt,
          phone,
          transactionDate,
        });

        // Convert transaction date if available
        let paymentDateTime = new Date();
        if (transactionDate) {
          try {
            const dateStr = transactionDate.toString();
            if (dateStr.length >= 14) {
              const year = dateStr.substring(0, 4);
              const month = dateStr.substring(4, 6);
              const day = dateStr.substring(6, 8);
              const hour = dateStr.substring(8, 10);
              const minute = dateStr.substring(10, 12);
              const second = dateStr.substring(12, 14);
              paymentDateTime = new Date(
                `${year}-${month}-${day}T${hour}:${minute}:${second}`,
              );
            }
          } catch (dateError) {
            console.error("Error parsing transaction date:", dateError);
          }
        }

        // Update payment record
        const updatedPayment = await prisma.payment.update({
          where: { id: payment.id },
          data: {
            mpesaReceipt: mpesaReceipt || payment.mpesaReceipt,
            paymentPhone: phone || payment.paymentPhone,
            paymentAmount: amount ? parseFloat(amount) : payment.paymentAmount,
            paymentDate: paymentDateTime,
            paymentStatus: "completed",
            resultCode: resultCodeStr,
            resultDesc: resultDesc || "Success",
            updatedAt: new Date(),
          },
        });

        // Update order to mark as paid
        await prisma.order.update({
          where: { id: payment.orderId },
          data: {
            isPaid: true,
            status: "paid",
            updatedAt: new Date(),
          },
        });

        // Clear the user's cart
        try {
          const userCart = await prisma.cart.findUnique({
            where: { userId: payment.order.userId },
            include: { items: true },
          });

          if (userCart && userCart.items.length > 0) {
            await prisma.cartItem.deleteMany({
              where: { cartId: userCart.id },
            });
            console.log(
              `✅ Cart cleared for user ${payment.order.userId} after successful payment`,
            );
          }
        } catch (cartError) {
          console.error("Error clearing cart:", cartError);
          // Continue even if cart clearing fails
        }

        console.log("✅ Payment processed successfully:", {
          paymentId: payment.id,
          orderId: payment.orderId,
          mpesaReceipt: mpesaReceipt,
        });
      } else {
        console.log("❌ Payment Failed:", {
          resultCode: resultCodeStr,
          resultDesc: resultDesc,
          checkoutRequestID,
          paymentId: payment.id,
          orderId: payment.orderId,
        });

        // Update payment as failed
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            paymentStatus: "failed",
            paymentError:
              resultDesc || `Payment failed with code ${resultCodeStr}`,
            resultCode: resultCodeStr,
            resultDesc: resultDesc,
            updatedAt: new Date(),
          },
        });

        // Update order status
        await prisma.order.update({
          where: { id: payment.orderId },
          data: {
            status: "payment_failed",
            updatedAt: new Date(),
          },
        });
      }

      res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
    } catch (error) {
      console.error("❌ Error processing callback:", error);
      console.error("Error stack:", error.stack);

      // Always return success to M-Pesa
      res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
    }
  },

  // Verify payment by checkoutRequestID
  async verifyPayment(req, res) {
    try {
      const { checkoutRequestID } = req.params;

      // Find payment by checkoutRequestID in Payment table
      const payment = await prisma.payment.findUnique({
        where: { checkoutRequestID },
        include: {
          order: {
            include: {
              items: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      price: true,
                      imageUrl: true,
                    },
                  },
                },
              },
              billing: true,
              shipping: true,
            },
          },
        },
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found",
          isPaid: false,
        });
      }

      res.json({
        success: true,
        isPaid: payment.paymentStatus === "completed",
        paymentId: payment.id,
        orderId: payment.orderId,
        paymentStatus: payment.paymentStatus,
        paymentDetails: {
          mpesaReceipt: payment.mpesaReceipt,
          phone: payment.paymentPhone,
          amount: payment.paymentAmount,
          date: payment.paymentDate,
          checkoutRequestID: payment.checkoutRequestID,
          transactionType: payment.transactionType,
        },
        order: {
          id: payment.order.id,
          totalAmount: payment.order.totalAmount,
          status: payment.order.status,
          isPaid: payment.order.isPaid,
          paymentMethod: payment.order.paymentMethod,
          shippingMethod: payment.order.shippingMethod,
          createdAt: payment.order.createdAt,
          items: payment.order.items,
          billing: payment.order.billing,
          shipping: payment.order.shipping,
        },
      });
    } catch (error) {
      console.error("Payment verification error:", error);
      res.status(500).json({
        success: false,
        message: "Error verifying payment",
        isPaid: false,
      });
    }
  },

  // Verify payment by order ID
  // In paymentController.verifyPaymentByOrderId function
  async verifyPaymentByOrderId(req, res) {
    try {
      const { orderId } = req.params;
      const guestId = req.guestId;
      const userId = req.userId;

      console.log(
        `📱 [Payment] Verifying payment for order ${orderId} by user ${user ? userId : guestId}`,
      );

      if (!orderId || isNaN(parseInt(orderId))) {
        return res.status(400).json({
          success: false,
          message: "Invalid order ID",
          isPaid: false,
        });
      }

      const order = await prisma.order.findUnique({
        where: {
          id: parseInt(orderId),
          userId: userId,
        },
        include: {
          payment: true,
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  imageUrl: true,
                },
              },
            },
          },
          billing: true,
          shipping: true,
        },
      });

      if (!order) {
        console.log(
          `❌ [Payment] Order ${orderId} not found for user ${userId}`,
        );
        return res.status(404).json({
          success: false,
          message: "Order not found or unauthorized",
          isPaid: false,
        });
      }

      console.log(`📊 [Payment] Order ${orderId} status:`, {
        isPaid: order.isPaid,
        status: order.status,
        paymentMethod: order.paymentMethod,
        hasPayment: !!order.payment,
        paymentStatus: order.payment?.paymentStatus,
        checkoutRequestID: order.payment?.checkoutRequestID,
      });

      res.json({
        success: true,
        isPaid: order.isPaid,
        orderId: order.id,
        status: order.status,
        hasPayment: !!order.payment,
        payment: order.payment
          ? {
              id: order.payment.id,
              paymentStatus: order.payment.paymentStatus,
              checkoutRequestID: order.payment.checkoutRequestID,
              mpesaReceipt: order.payment.mpesaReceipt,
              paymentPhone: order.payment.paymentPhone,
              paymentAmount: order.payment.paymentAmount,
              paymentDate: order.payment.paymentDate,
            }
          : null,
        order: {
          id: order.id,
          totalAmount: order.totalAmount,
          paymentMethod: order.paymentMethod,
          shippingMethod: order.shippingMethod,
          createdAt: order.createdAt,
          items: order.items,
          billing: order.billing,
          shipping: order.shipping,
        },
      });
    } catch (error) {
      console.error("❌ [Payment] Order payment verification error:", error);
      res.status(500).json({
        success: false,
        message: "Error verifying order payment",
        isPaid: false,
        error: error.message,
      });
    }
  },

  // Get payment status for multiple orders
  async getPaymentStatus(req, res) {
    try {
      const { orderIds } = req.body;
      const userId = req.userId;

      if (!orderIds || !Array.isArray(orderIds)) {
        return res.status(400).json({
          success: false,
          message: "orderIds array is required",
        });
      }

      const orders = await prisma.order.findMany({
        where: {
          id: {
            in: orderIds.map((id) => parseInt(id)),
          },
          userId: userId,
        },
        include: {
          payment: {
            select: {
              id: true,
              paymentStatus: true,
              checkoutRequestID: true,
              mpesaReceipt: true,
              paymentPhone: true,
              paymentAmount: true,
              paymentDate: true,
              transactionType: true,
            },
          },
        },
      });

      // Create a map for quick lookup
      const orderStatusMap = {};
      orders.forEach((order) => {
        orderStatusMap[order.id] = {
          isPaid: order.isPaid,
          status: order.status,
          hasPayment: !!order.payment,
          payment: order.payment
            ? {
                paymentStatus: order.payment.paymentStatus,
                checkoutRequestID: order.payment.checkoutRequestID,
                mpesaReceipt: order.payment.mpesaReceipt,
                transactionType: order.payment.transactionType,
              }
            : null,
          paymentMethod: order.paymentMethod,
          totalAmount: order.totalAmount,
        };
      });

      res.json({
        success: true,
        orderStatuses: orderStatusMap,
      });
    } catch (error) {
      console.error("Get payment status error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching payment statuses",
      });
    }
  },

  // In controllers/payment.js, add these methods to paymentController:

  // Get all payments (Admin only)
  async getAllPayments(req, res) {
    try {
      const {
        status,
        paymentMethod,
        startDate,
        endDate,
        page = 1,
        limit = 20,
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = {};

      if (status) where.paymentStatus = status;
      if (paymentMethod) where.transactionType = paymentMethod;

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          where,
          include: {
            order: {
              select: {
                id: true,
                totalAmount: true,
                status: true,
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
            processedByUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          skip,
          take: parseInt(limit),
        }),
        prisma.payment.count({ where }),
      ]);

      return res.status(200).json({
        payments,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      console.error("Get payments error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  // Get payment by ID (Admin only)
  async getPaymentById(req, res) {
    try {
      const { paymentId } = req.params;

      const payment = await prisma.payment.findUnique({
        where: { id: parseInt(paymentId) },
        include: {
          order: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  contact: true,
                },
              },
              items: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      price: true,
                      imageUrl: true,
                    },
                  },
                },
              },
            },
          },
          processedByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      return res.status(200).json({ payment });
    } catch (error) {
      console.error("Get payment error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  // Admin: Verify/Process payment
  async processPayment(req, res) {
    try {
      const { paymentId } = req.params;
      const { notes, status } = req.validatedData;
      const adminId = req.userId;

      const payment = await prisma.payment.findUnique({
        where: { id: parseInt(paymentId) },
        include: { order: true },
      });

      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      // Update payment with admin info
      const updatedPayment = await prisma.payment.update({
        where: { id: parseInt(paymentId) },
        data: {
          paymentStatus: status || "completed",
          processedBy: adminId,
          processedAt: new Date(),
          notes,
        },
        include: {
          order: {
            select: {
              id: true,
              totalAmount: true,
              status: true,
            },
          },
          processedByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Update order if payment is completed
      if (
        updatedPayment.paymentStatus === "completed" &&
        updatedPayment.order
      ) {
        await prisma.order.update({
          where: { id: updatedPayment.order.id },
          data: {
            isPaid: true,
            status: "processing",
          },
        });
      }

      return res.status(200).json({
        message: "Payment processed successfully",
        payment: updatedPayment,
      });
    } catch (error) {
      console.error("Process payment error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  async getPaymentStats(req, res) {
    try {
      console.log("Fetching payment stats for admin dashboard");

      // Calculate date ranges
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const thisWeek = new Date(today);
      thisWeek.setDate(thisWeek.getDate() - 7);

      const thisMonth = new Date(today);
      thisMonth.setMonth(thisMonth.getMonth() - 1);

      const thisYear = new Date(today);
      thisYear.setFullYear(thisYear.getFullYear() - 1);

      // Get overall stats
      const [
        totalPayments,
        totalRevenue,
        totalUsers,
        totalProducts,
        totalOrders,
        pendingOrders,
        todayRevenue,
        todayOrders,
        weekRevenue,
        monthRevenue,
        mpesaPayments,
        cashPayments,
        completedPayments,
        failedPayments,
        pendingPaymentsCount,
      ] = await Promise.all([
        // Total payments count
        prisma.payment.count(),

        // Total revenue (sum of completed payments)
        prisma.payment.aggregate({
          where: { paymentStatus: "completed" },
          _sum: { paymentAmount: true },
        }),

        // Total users
        prisma.user.count(),

        // Total products
        prisma.product.count(),

        // Total orders
        prisma.order.count(),

        // Pending orders (not paid or pending_payment)
        prisma.order.count({
          where: {
            OR: [
              { status: "pending" },
              { status: "pending_payment" },
              { isPaid: false },
            ],
          },
        }),

        // Today's revenue
        prisma.payment.aggregate({
          where: {
            paymentStatus: "completed",
            createdAt: { gte: today },
          },
          _sum: { paymentAmount: true },
        }),

        // Today's orders
        prisma.order.count({
          where: { createdAt: { gte: today } },
        }),

        // This week's revenue
        prisma.payment.aggregate({
          where: {
            paymentStatus: "completed",
            createdAt: { gte: thisWeek },
          },
          _sum: { paymentAmount: true },
        }),

        // This month's revenue
        prisma.payment.aggregate({
          where: {
            paymentStatus: "completed",
            createdAt: { gte: thisMonth },
          },
          _sum: { paymentAmount: true },
        }),

        // M-Pesa payments count
        prisma.payment.count({
          where: { transactionType: "M-Pesa" },
        }),

        // Cash payments (non-M-Pesa)
        prisma.order.count({
          where: {
            paymentMethod: { not: "pay now with mpesa" },
            isPaid: true,
          },
        }),

        // Completed payments
        prisma.payment.count({
          where: { paymentStatus: "completed" },
        }),

        // Failed payments
        prisma.payment.count({
          where: { paymentStatus: "failed" },
        }),

        // Pending payments
        prisma.payment.count({
          where: { paymentStatus: "pending" },
        }),
      ]);

      // Get recent orders (last 10)
      const recentOrders = await prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          payment: {
            select: {
              paymentStatus: true,
              paymentAmount: true,
            },
          },
        },
      });

      // Get recent payments (last 10)
      const recentPayments = await prisma.payment.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          order: {
            select: {
              id: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      // Format recent orders for frontend
      const formattedRecentOrders = recentOrders.map((order) => ({
        id: order.id,
        customerName:
          `${order.user?.firstName || ""} ${
            order.user?.lastName || ""
          }`.trim() || "Anonymous",
        totalAmount: order.totalAmount,
        status: order.status,
        isPaid: order.isPaid,
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt,
      }));

      // Format recent payments for frontend
      const formattedRecentPayments = recentPayments.map((payment) => ({
        id: payment.id,
        orderId: payment.orderId,
        amount: payment.paymentAmount,
        method: payment.transactionType,
        status: payment.paymentStatus,
        checkoutRequestID: payment.checkoutRequestID,
        mpesaReceipt: payment.mpesaReceipt,
        createdAt: payment.createdAt,
      }));

      // Calculate conversion rate (paid orders / total orders)
      const paidOrders = await prisma.order.count({ where: { isPaid: true } });
      const conversionRate =
        totalOrders > 0 ? ((paidOrders / totalOrders) * 100).toFixed(2) : 0;

      // Calculate average order value
      const avgOrderValue =
        totalOrders > 0
          ? (totalRevenue._sum.paymentAmount || 0) / totalOrders
          : 0;

      return res.status(200).json({
        success: true,
        stats: {
          // Dashboard cards data
          totalRevenue: totalRevenue._sum.paymentAmount || 0,
          totalOrders,
          totalUsers,
          totalProducts,
          pendingOrders,
          todayRevenue: todayRevenue._sum.paymentAmount || 0,
          todayOrders,

          // Additional stats
          weekRevenue: weekRevenue._sum.paymentAmount || 0,
          monthRevenue: monthRevenue._sum.paymentAmount || 0,
          totalPayments,
          completedPayments,
          failedPayments,
          pendingPayments: pendingPaymentsCount,
          mpesaPayments,
          cashPayments,

          // Calculated metrics
          conversionRate: parseFloat(conversionRate),
          avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),

          // Time-based revenue
          revenueTrends: {
            today: todayRevenue._sum.paymentAmount || 0,
            week: weekRevenue._sum.paymentAmount || 0,
            month: monthRevenue._sum.paymentAmount || 0,
            allTime: totalRevenue._sum.paymentAmount || 0,
          },

          // Payment method breakdown
          paymentMethods: {
            mpesa: mpesaPayments,
            cash: cashPayments,
            total: totalPayments,
          },

          // Order status breakdown
          orderStatus: {
            pending: pendingOrders,
            paid: paidOrders,
            total: totalOrders,
          },
        },

        // Recent activity data
        recentActivity: {
          orders: formattedRecentOrders,
          payments: formattedRecentPayments,
        },
      });
    } catch (error) {
      console.error("Error getting payment stats:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch dashboard statistics",
      });
    }
  },
  async testCallback(req, res) {
    try {
      console.log("Test callback received:", req.body);

      // Simulate successful payment
      const { orderId, checkoutRequestID } = req.body;

      if (!orderId || !checkoutRequestID) {
        return res.status(400).json({ error: "Missing parameters" });
      }

      // Update payment and order manually
      const payment = await prisma.payment.update({
        where: { checkoutRequestID },
        data: {
          paymentStatus: "completed",
          mpesaReceipt: "TEST_" + Date.now(),
          resultCode: "0",
          resultDesc: "Success",
        },
      });

      await prisma.order.update({
        where: { id: parseInt(orderId) },
        data: {
          isPaid: true,
          status: "paid",
        },
      });

      console.log(`Test callback processed for order ${orderId}`);

      return res.status(200).json({
        success: true,
        message: "Test callback processed",
      });
    } catch (error) {
      console.error("Test callback error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  // Add to paymentController in payment.js
  async manualVerifyPayment(req, res) {
    try {
      const { orderId, checkoutRequestID } = req.body;
      const userId = req.userId;
      const guestId = req.guestId;

      console.log(`🔍 Manual payment verification for order ${orderId}`);

      if (!orderId || !checkoutRequestID) {
        return res.status(400).json({
          success: false,
          message: "Order ID and CheckoutRequestID are required",
        });
      }

      let user;
      let guest;

      if (userId) {
        user = await prisma.user.findUnique({
          where: { id: currentUserId },
        });
      } else {
        guest = await prisma.guest.findUnique({
          where: {
            id: guestId,
          },
        });
      }

      if (user) {
        // Verify order belongs to user
        const order = await prisma.order.findFirst({
          where: {
            id: parseInt(orderId),
            userId: userId,
          },
          include: {
            payment: true,
          },
        });

        if (!order) {
          return res.status(404).json({
            success: false,
            message: "Order not found",
          });
        }

        // Check if payment already exists
        if (order.payment && order.payment.paymentStatus === "completed") {
          return res.json({
            success: true,
            isPaid: true,
            message: "Payment already completed",
          });
        }

        // If there's no payment record, create one
        if (!order.payment) {
          await prisma.payment.create({
            data: {
              orderId: parseInt(orderId),
              checkoutRequestID: checkoutRequestID,
              paymentStatus: "completed",
              paymentPhone: order.contact || "",
              paymentAmount: order.totalAmount,
              transactionType: "M-Pesa",
              mpesaReceipt: "MANUAL_VERIFY_" + Date.now(),
              resultCode: "0",
              resultDesc: "Manually verified",
            },
          });
        } else {
          // Update existing payment
          await prisma.payment.update({
            where: { id: order.payment.id },
            data: {
              paymentStatus: "completed",
              resultCode: "0",
              resultDesc: "Manually verified",
            },
          });
        }

        // Update order
        await prisma.order.update({
          where: { id: order.id },
          data: {
            isPaid: true,
            status: "paid",
          },
        });

        // Clear cart
        const cart = await prisma.cart.findUnique({
          where: { userId: userId },
          include: { items: true },
        });

        if (cart && cart.items.length > 0) {
          await prisma.cartItem.deleteMany({
            where: { cartId: cart.id },
          });
          console.log(`✅ Cart cleared for user ${userId}`);
        }

        return res.json({
          success: true,
          isPaid: true,
          message: "Payment verified and order updated successfully",
        });
      } else if (guest) {
        // Verify order belongs to user
        const order = await prisma.order.findFirst({
          where: {
            id: parseInt(orderId),
            guestId: guestId,
          },
          include: {
            payment: true,
          },
        });

        if (!order) {
          return res.status(404).json({
            success: false,
            message: "Order not found",
          });
        }

        // Check if payment already exists
        if (order.payment && order.payment.paymentStatus === "completed") {
          return res.json({
            success: true,
            isPaid: true,
            message: "Payment already completed",
          });
        }

        // If there's no payment record, create one
        if (!order.payment) {
          await prisma.payment.create({
            data: {
              orderId: parseInt(orderId),
              checkoutRequestID: checkoutRequestID,
              paymentStatus: "completed",
              paymentPhone: order.contact || "",
              paymentAmount: order.totalAmount,
              transactionType: "M-Pesa",
              mpesaReceipt: "MANUAL_VERIFY_" + Date.now(),
              resultCode: "0",
              resultDesc: "Manually verified",
            },
          });
        } else {
          // Update existing payment
          await prisma.payment.update({
            where: { id: order.payment.id },
            data: {
              paymentStatus: "completed",
              resultCode: "0",
              resultDesc: "Manually verified",
            },
          });
        }

        // Update order
        await prisma.order.update({
          where: { id: order.id },
          data: {
            isPaid: true,
            status: "paid",
          },
        });

        // Clear cart
        const cart = await prisma.cart.findUnique({
          where: { guestId: guestId },
          include: { items: true },
        });

        if (cart && cart.items.length > 0) {
          await prisma.cartItem.deleteMany({
            where: { cartId: cart.id },
          });
          console.log(`✅ Cart cleared for guest ${guestId}`);
        }

        return res.json({
          success: true,
          isPaid: true,
          message: "Payment verified and order updated successfully",
        });
      } else {
        return res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      console.error("Manual verification error:", error);
      return res.status(500).json({
        success: false,
        message: "Error verifying payment",
        error: error.message,
      });
    }
  },

  async queryPaymentStatus(req, res) {
    try {
      const { checkoutRequestID } = req.validatedData;
      const userId = req.userId;
      const guestId = req.guestId;

      console.log(`🔍 Querying payment status for: ${checkoutRequestID}`);

      if (!checkoutRequestID) {
        return res.status(400).json({
          success: false,
          message: "CheckoutRequestID is required",
        });
      }

      // Get access token
      const accessToken = await getAccessToken();
      const { timestamp, password } = generatePassword();

      const queryPayload = {
        BusinessShortCode: appConfig.credentials.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestID,
      };

      console.log("🔍 M-Pesa Query Payload:", queryPayload);

      const response = await axios.post(
        "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query",
        queryPayload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        },
      );

      console.log("🔍 M-Pesa Query Response:", response.data);

      // IMPORTANT: Convert to string for consistent comparison
      const resultCode = response.data.ResultCode
        ? response.data.ResultCode.toString()
        : "";
      const resultDesc = response.data.ResultDesc
        ? response.data.ResultDesc.toString()
        : "";

      console.log(`🔍 ResultCode: ${resultCode} (type: ${typeof resultCode})`);
      console.log(`🔍 ResultDesc: ${resultDesc} (type: ${typeof resultDesc})`);

      // Check if payment is successful (resultCode "0" as string)
      if (resultCode === "0") {
        // Payment is successful!
        console.log("✅ M-Pesa API confirms payment SUCCESS");

        // Find payment by checkoutRequestID
        const payment = await prisma.payment.findUnique({
          where: { checkoutRequestID: checkoutRequestID },
          include: { order: true },
        });

        if (payment) {
          // Extract M-Pesa receipt if available
          let mpesaReceipt = null;
          if (
            response.data.CallbackMetadata &&
            response.data.CallbackMetadata.Item
          ) {
            const items = Array.isArray(response.data.CallbackMetadata.Item)
              ? response.data.CallbackMetadata.Item
              : [response.data.CallbackMetadata.Item];

            const receiptItem = items.find(
              (item) => item.Name === "MpesaReceiptNumber",
            );
            if (receiptItem && receiptItem.Value) {
              mpesaReceipt = receiptItem.Value.toString();
            }
          }

          // Update payment
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              paymentStatus: "completed",
              resultCode: resultCode,
              resultDesc: resultDesc,
              mpesaReceipt: mpesaReceipt || payment.mpesaReceipt,
              updatedAt: new Date(),
            },
          });

          // Update order
          await prisma.order.update({
            where: { id: payment.orderId },
            data: {
              isPaid: true,
              status: "paid",
              updatedAt: new Date(),
            },
          });

          let cart;

          if (userId) {
            cart = await prisma.cart.findUnique({
              where: { userId: payment.order.userId },
              include: { items: true },
            });
          } else if (guestId) {
            cart = await prisma.cart.findUnique({
              where: { guestId: payment.order.guestId },
              include: { items: true },
            });
          } else {
            return res.status(404).json({ error: "User not found" });
          }

          if (cart && cart.items.length > 0) {
            await prisma.cartItem.deleteMany({
              where: { cartId: cart.id },
            });
          }

          return res.json({
            success: true,
            isPaid: true,
            message: "Payment confirmed by M-Pesa",
            resultCode: resultCode,
            resultDesc: resultDesc,
            mpesaReceipt: mpesaReceipt,
          });
        } else {
          // Payment exists in M-Pesa but not in our database
          console.log(
            `⚠️ Payment confirmed by M-Pesa but no local record for ${checkoutRequestID}`,
          );
          return res.json({
            success: true,
            isPaid: true,
            message: "Payment confirmed by M-Pesa but no local record",
            resultCode: resultCode,
            resultDesc: resultDesc,
          });
        }
      }

      // Payment not completed or failed
      console.log(`❌ Payment not completed: ${resultCode} - ${resultDesc}`);

      // Map common error codes to user-friendly messages
      let userMessage = resultDesc;
      if (resultCode === "1") {
        userMessage = "Insufficient funds in your M-Pesa account";
      } else if (resultCode === "1032") {
        userMessage = "Payment cancelled by user";
      } else if (resultCode === "1037") {
        userMessage = "Payment timeout - please try again";
      } else if (resultCode === "2001") {
        userMessage = "Service temporarily unavailable";
      } else if (resultCode === "2007") {
        userMessage = "Transaction in progress - please wait";
      }

      return res.json({
        success: false,
        isPaid: false,
        message: userMessage,
        resultCode: resultCode,
        resultDesc: resultDesc,
        technicalMessage: resultDesc, // Include original for debugging
      });
    } catch (error) {
      console.error("❌ Query payment status error:", error.message);

      // Try to get more details
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);

        // M-Pesa specific errors
        if (error.response.data && error.response.data.errorCode) {
          return res.status(400).json({
            success: false,
            isPaid: false,
            message: `M-Pesa error: ${
              error.response.data.errorMessage || "Unknown error"
            }`,
            errorCode: error.response.data.errorCode.toString(),
          });
        }
      }

      return res.status(500).json({
        success: false,
        isPaid: false,
        message: "Failed to query payment status",
        error: error.message,
      });
    }
  },
};
