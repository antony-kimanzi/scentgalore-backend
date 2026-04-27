import prisma from "../lib/prisma.js";

export const orderController = {
  async createOrder(req, res) {
    try {
      const currentUserId = req.userId;
      const guestId = req.guestId;
      const cartId = req.params.id;
      const orderData = req.validatedData;

      const { shipping, billing, ...orderMainData } = orderData;

      let user;
      let guest;

      // Validate that contact exists
      if (!orderMainData.contact) {
        return res
          .status(400)
          .json({ error: "Contact information is required" });
      }

      if (currentUserId) {
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
        const cart = await prisma.cart.findUnique({
          where: { id: parseInt(cartId) },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        });

        if (!cart) {
          return res.status(404).json({ error: "Cart not found" });
        }

        if (!cart.items || cart.items.length === 0) {
          return res.status(400).json({ error: "Cart is empty" });
        }

        // Calculate total amount from cart items if not provided
        const totalAmount =
          orderMainData.totalAmount ||
          cart.items.reduce(
            (sum, item) => sum + parseFloat(item.price) * item.quantity,
            0,
          );

        // Determine order status based on payment method
        const status =
          orderMainData.paymentMethod === "pay now with mpesa"
            ? "pending_payment"
            : "pending";

        // Determine if order is paid based on payment method
        // IMPORTANT: For M-Pesa, order is NOT paid initially
        const isPaid = orderMainData.paymentMethod !== "pay now with mpesa";

        // Create order
        const order = await prisma.order.create({
          data: {
            userId: user.id,
            contact: orderMainData.contact,
            totalAmount: totalAmount,
            paymentMethod: orderMainData.paymentMethod,
            shippingMethod: orderMainData.shippingMethod,
            isPaid: isPaid, // Will be false for M-Pesa
            status: status, // Will be "pending_payment" for M-Pesa
          },
        });

        // Create order items from cart items
        await prisma.orderItem.createMany({
          data: cart.items.map((cartItem) => ({
            orderId: order.id,
            productId: cartItem.productId,
            quantity: cartItem.quantity,
            price: parseFloat(cartItem.price),
          })),
        });

        let shippingDetail = null;
        if (orderMainData.shippingMethod === "delivery" && shipping) {
          shippingDetail = await prisma.shippingDetail.create({
            data: {
              orderId: order.id,
              firstName: shipping.firstName,
              lastName: shipping.lastName,
              email: shipping.email,
              city: shipping.city,
              phoneNumber: shipping.phoneNumber,
              apartment: shipping.apartment ?? null,
              postalCode: shipping.postalCode ?? null,
            },
          });
        }

        // Use billing data if provided, otherwise use shipping data
        const billingData = billing || shipping;
        let billingDetail = null;
        if (billingData) {
          billingDetail = await prisma.billingDetail.create({
            data: {
              orderId: order.id,
              firstName: billingData.firstName,
              lastName: billingData.lastName,
              phoneNumber: billingData.phoneNumber,
              email: billingData.email ?? null,
            },
          });
        }

        // IMPORTANT: DO NOT clear cart for M-Pesa orders until payment is successful
        // Only clear cart immediately for non-M-Pesa payment methods
        const shouldClearCart =
          orderMainData.paymentMethod !== "pay now with mpesa";

        if (shouldClearCart) {
          // Clear cart after order creation for non-M-Pesa payments
          await prisma.cartItem.deleteMany({
            where: { cartId: cart.id },
          });

          console.log(
            `Cart cleared immediately for order ${order.id} - Payment method: ${orderMainData.paymentMethod}`,
          );
        } else {
          console.log(
            `Cart NOT cleared for M-Pesa order ${order.id} - Waiting for payment confirmation`,
          );
        }

        // Get created order with all details
        const completeOrder = await prisma.order.findUnique({
          where: { id: order.id },
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
            shipping: true,
            billing: true,
            payment: true,
          },
        });

        return res.status(201).json({
          success: true,
          message: "Order created successfully",
          order: completeOrder,
          orderId: completeOrder.id,
          cartCleared: shouldClearCart,
          // Return this flag so frontend knows if payment initiation is needed
          requiresPayment: orderMainData.paymentMethod === "pay now with mpesa",
        });
      } else if (guest) {
        await prisma.guest.upsert({
          where: { id: guestId },
          update: { email: orderMainData.contact },
          create: { id: guestId, email: orderMainData.contact },
        });

        const cart = await prisma.cart.findUnique({
          where: { id: parseInt(cartId) },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        });

        if (!cart) {
          return res.status(404).json({ error: "Cart not found" });
        }

        if (!cart.items || cart.items.length === 0) {
          return res.status(400).json({ error: "Cart is empty" });
        }

        // Calculate total amount from cart items if not provided
        const totalAmount =
          orderMainData.totalAmount ||
          cart.items.reduce(
            (sum, item) => sum + parseFloat(item.price) * item.quantity,
            0,
          );

        // Determine order status based on payment method
        const status =
          orderMainData.paymentMethod === "pay now with mpesa"
            ? "pending_payment"
            : "pending";

        // Determine if order is paid based on payment method
        // IMPORTANT: For M-Pesa, order is NOT paid initially
        const isPaid = orderMainData.paymentMethod !== "pay now with mpesa";

        // Create order
        const order = await prisma.order.create({
          data: {
            guestId: guest.id,
            contact: orderMainData.contact,
            totalAmount: totalAmount,
            paymentMethod: orderMainData.paymentMethod,
            shippingMethod: orderMainData.shippingMethod,
            isPaid: isPaid, // Will be false for M-Pesa
            status: status, // Will be "pending_payment" for M-Pesa
          },
        });

        // Create order items from cart items
        await prisma.orderItem.createMany({
          data: cart.items.map((cartItem) => ({
            orderId: order.id,
            productId: cartItem.productId,
            quantity: cartItem.quantity,
            price: parseFloat(cartItem.price),
          })),
        });

        let shippingDetail = null;
        if (orderMainData.shippingMethod === "delivery" && shipping) {
          shippingDetail = await prisma.shippingDetail.create({
            data: {
              orderId: order.id,
              firstName: shipping.firstName,
              lastName: shipping.lastName,
              email: shipping.email,
              city: shipping.city,
              phoneNumber: shipping.phoneNumber,
              apartment: shipping.apartment ?? null,
              postalCode: shipping.postalCode ?? null,
            },
          });
        }

        // Use billing data if provided, otherwise use shipping data
        const billingData = billing || shipping;
        let billingDetail = null;
        if (billingData) {
          billingDetail = await prisma.billingDetail.create({
            data: {
              orderId: order.id,
              firstName: billingData.firstName,
              lastName: billingData.lastName,
              phoneNumber: billingData.phoneNumber,
              email: billingData.email ?? null,
            },
          });
        }

        // IMPORTANT: DO NOT clear cart for M-Pesa orders until payment is successful
        // Only clear cart immediately for non-M-Pesa payment methods
        const shouldClearCart =
          orderMainData.paymentMethod !== "pay now with mpesa";

        if (shouldClearCart) {
          // Clear cart after order creation for non-M-Pesa payments
          await prisma.cartItem.deleteMany({
            where: { cartId: cart.id },
          });

          console.log(
            `Cart cleared immediately for order ${order.id} - Payment method: ${orderMainData.paymentMethod}`,
          );
        } else {
          console.log(
            `Cart NOT cleared for M-Pesa order ${order.id} - Waiting for payment confirmation`,
          );
        }

        // Get created order with all details
        const completeOrder = await prisma.order.findUnique({
          where: { id: order.id },
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
            shipping: true,
            billing: true,
            payment: true,
          },
        });

        return res.status(201).json({
          success: true,
          message: "Order created successfully",
          order: completeOrder,
          orderId: completeOrder.id,
          cartCleared: shouldClearCart,
          // Return this flag so frontend knows if payment initiation is needed
          requiresPayment: orderMainData.paymentMethod === "pay now with mpesa",
        });
      } else {
        return res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      console.log("Create order error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  async updateOrder(req, res) {
    try {
      const currentUserId = req.userId;
      const guestId = req.guestId;
      const orderId = parseInt(req.params.id);
      const updateData = req.validatedData;

      let user;
      let guest;

      if (currentUserId) {
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
        const existingOrder = await prisma.order.findFirst({
          where: { id: orderId, userId: user.id },
        });

        if (!existingOrder) {
          return res.status(404).json({ error: "Order not found" });
        }

        // Prepare update data - Only update fields that exist in Order model
        const updateFields = {};
        if (updateData.status) updateFields.status = updateData.status;
        if (updateData.paymentMethod)
          updateFields.paymentMethod = updateData.paymentMethod;
        if (updateData.shippingMethod)
          updateFields.shippingMethod = updateData.shippingMethod;
        if (updateData.totalAmount)
          updateFields.totalAmount = updateData.totalAmount;
        if (updateData.isPaid !== undefined)
          updateFields.isPaid = updateData.isPaid;
        if (updateData.contact) updateFields.contact = updateData.contact;

        const order = await prisma.order.update({
          where: { id: existingOrder.id },
          data: updateFields,
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
            shipping: true,
            billing: true,
            payment: true, // Include payment from Payment table
          },
        });

        return res.status(200).json({
          success: true,
          order,
        });
      } else if (guest) {
        const existingOrder = await prisma.order.findFirst({
          where: { id: orderId, guestId: guest.id },
        });

        if (!existingOrder) {
          return res.status(404).json({ error: "Order not found" });
        }

        // Prepare update data - Only update fields that exist in Order model
        const updateFields = {};
        if (updateData.status) updateFields.status = updateData.status;
        if (updateData.paymentMethod)
          updateFields.paymentMethod = updateData.paymentMethod;
        if (updateData.shippingMethod)
          updateFields.shippingMethod = updateData.shippingMethod;
        if (updateData.totalAmount)
          updateFields.totalAmount = updateData.totalAmount;
        if (updateData.isPaid !== undefined)
          updateFields.isPaid = updateData.isPaid;
        if (updateData.contact) updateFields.contact = updateData.contact;

        const order = await prisma.order.update({
          where: { id: existingOrder.id },
          data: updateFields,
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
            shipping: true,
            billing: true,
            payment: true, // Include payment from Payment table
          },
        });

        return res.status(200).json({
          success: true,
          order,
        });
      } else {
        return res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      console.log("Update order error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  async getOrder(req, res) {
    try {
      const currentUserId = req.userId;
      const guestId = req.guestId;
      const orderId = parseInt(req.params.id);

      let user;
      let guest;

      if (currentUserId) {
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
        const order = await prisma.order.findFirst({
          where: { id: orderId, userId: user.id },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    shortDescription: true,
                    description: true,
                    price: true,
                    imageUrl: true,
                    category: true,
                  },
                },
              },
            },
            shipping: true,
            billing: true,
            payment: true, // Include payment from Payment table
          },
        });

        if (!order) {
          return res.status(404).json({ error: "Order not found" });
        }

        return res.status(200).json({
          success: true,
          order,
        });
      } else if (guest) {
        const order = await prisma.order.findFirst({
          where: { id: orderId, guestId: guest.id },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    shortDescription: true,
                    description: true,
                    price: true,
                    imageUrl: true,
                    category: true,
                  },
                },
              },
            },
            shipping: true,
            billing: true,
            payment: true, // Include payment from Payment table
          },
        });

        if (!order) {
          return res.status(404).json({ error: "Order not found" });
        }

        return res.status(200).json({
          success: true,
          order,
        });
      } else {
        return res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      console.log("Get order error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  async getAllOrders(req, res) {
    try {
      const orders = await prisma.order.findMany({
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
          shipping: true,
          billing: true,
          payment: true, // Include payment from Payment table
        },
        orderBy: { createdAt: "desc" },
      });

      if (!orders || orders.length === 0) {
        return res.status(200).json({
          success: true,
          orders: [],
          message: "No orders found",
        });
      }

      return res.status(200).json({
        success: true,
        orders,
      });
    } catch (error) {
      console.log("Get all orders error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  async getUserOrders(req, res) {
    try {
      const guestId = req.guestId;
      const currentUserId = req.userId;

      let user;
      let guest;

      if (currentUserId) {
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
        const orders = await prisma.order.findMany({
          where: { userId: user.id },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
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
            shipping: true,
            billing: true,
            payment: true,
          },
          orderBy: { createdAt: "desc" },
        });

        if (!orders || orders.length === 0) {
          return res.status(200).json({
            success: true,
            orders: [],
            message: "No orders found",
          });
        }

        return res.status(200).json({
          success: true,
          orders,
        });
      } else if (guest) {
        const orders = await prisma.order.findMany({
          where: { guestId: guest.id },
          include: {
            guest: {
              select: {
                email: true,
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
            shipping: true,
            billing: true,
            payment: true,
          },
          orderBy: { createdAt: "desc" },
        });

        if (!orders || orders.length === 0) {
          return res.status(200).json({
            success: true,
            orders: [],
            message: "No orders found",
          });
        }

        return res.status(200).json({
          success: true,
          orders,
        });
      } else {
        return res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      console.log("Get all orders error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  async deleteOrder(req, res) {
    try {
      const guestId = req.guestId;
      const currentUserId = req.userId;
      const orderId = parseInt(req.params.id);

      let user;
      let guest;

      if (currentUserId) {
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
        const order = await prisma.order.findFirst({
          where: { id: orderId, userId: user.id },
          include: {
            items: true,
            payment: true,
          },
        });

        if (!order) {
          return res.status(404).json({ error: "Order not found" });
        }

        // For M-Pesa orders that are NOT paid, restore cart items
        const shouldRestoreCart =
          order.paymentMethod === "pay now with mpesa" && !order.isPaid;

        if (shouldRestoreCart) {
          // Find user's cart
          const cart = await prisma.cart.findUnique({
            where: { userId: user.id },
          });

          if (cart && order.items && order.items.length > 0) {
            console.log(
              `Restoring ${order.items.length} items to cart for unpaid M-Pesa order ${orderId}`,
            );

            // Restore each item to the cart
            for (const orderItem of order.items) {
              try {
                // Check if item already exists in cart
                const existingCartItem = await prisma.cartItem.findFirst({
                  where: {
                    cartId: cart.id,
                    productId: orderItem.productId,
                  },
                });

                if (existingCartItem) {
                  // Update quantity if item exists
                  await prisma.cartItem.update({
                    where: { id: existingCartItem.id },
                    data: {
                      quantity: existingCartItem.quantity + orderItem.quantity,
                    },
                  });
                } else {
                  // Add new item to cart
                  await prisma.cartItem.create({
                    data: {
                      cartId: cart.id,
                      productId: orderItem.productId,
                      quantity: orderItem.quantity,
                      price: orderItem.price,
                    },
                  });
                }
              } catch (itemError) {
                console.error(
                  `Failed to restore item ${orderItem.productId}:`,
                  itemError,
                );
              }
            }

            console.log(
              `Cart restored for user ${user.id} from failed/unpaid M-Pesa order`,
            );
          }
        } else {
          console.log(
            `No cart restoration needed for order ${orderId} - Payment method: ${order.paymentMethod}, IsPaid: ${order.isPaid}`,
          );
        }

        // Delete payment record first (if exists)
        if (order.payment) {
          await prisma.payment.delete({
            where: { id: order.payment.id },
          });
        }

        // Now delete the order
        await prisma.order.delete({ where: { id: order.id } });

        return res.status(200).json({
          success: true,
          message: "Order deleted successfully",
          itemsRestored: shouldRestoreCart ? order.items?.length || 0 : 0,
          cartRestored: shouldRestoreCart,
        });
      } else if (guest) {
        const order = await prisma.order.findFirst({
          where: { id: orderId, guestId: guest.id },
          include: {
            items: true,
            payment: true,
          },
        });

        if (!order) {
          return res.status(404).json({ error: "Order not found" });
        }

        // For M-Pesa orders that are NOT paid, restore cart items
        const shouldRestoreCart =
          order.paymentMethod === "pay now with mpesa" && !order.isPaid;

        if (shouldRestoreCart) {
          // Find user's cart
          const cart = await prisma.cart.findUnique({
            where: { userId: user.id },
          });

          if (cart && order.items && order.items.length > 0) {
            console.log(
              `Restoring ${order.items.length} items to cart for unpaid M-Pesa order ${orderId}`,
            );

            // Restore each item to the cart
            for (const orderItem of order.items) {
              try {
                // Check if item already exists in cart
                const existingCartItem = await prisma.cartItem.findFirst({
                  where: {
                    cartId: cart.id,
                    productId: orderItem.productId,
                  },
                });

                if (existingCartItem) {
                  // Update quantity if item exists
                  await prisma.cartItem.update({
                    where: { id: existingCartItem.id },
                    data: {
                      quantity: existingCartItem.quantity + orderItem.quantity,
                    },
                  });
                } else {
                  // Add new item to cart
                  await prisma.cartItem.create({
                    data: {
                      cartId: cart.id,
                      productId: orderItem.productId,
                      quantity: orderItem.quantity,
                      price: orderItem.price,
                    },
                  });
                }
              } catch (itemError) {
                console.error(
                  `Failed to restore item ${orderItem.productId}:`,
                  itemError,
                );
              }
            }

            console.log(
              `Cart restored for user ${user.id} from failed/unpaid M-Pesa order`,
            );
          }
        } else {
          console.log(
            `No cart restoration needed for order ${orderId} - Payment method: ${order.paymentMethod}, IsPaid: ${order.isPaid}`,
          );
        }

        // Delete payment record first (if exists)
        if (order.payment) {
          await prisma.payment.delete({
            where: { id: order.payment.id },
          });
        }

        // Now delete the order
        await prisma.order.delete({ where: { id: order.id } });

        return res.status(200).json({
          success: true,
          message: "Order deleted successfully",
          itemsRestored: shouldRestoreCart ? order.items?.length || 0 : 0,
          cartRestored: shouldRestoreCart,
        });
      } else {
        return res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      console.log("Delete order error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  // In orderController.verifyOrderPayment function
  async verifyOrderPayment(req, res) {
    try {
      const orderId = parseInt(req.params.orderId);
      const currentUserId = req.userId;
      const guestId = req.guestId;

      let user;
      let guest;

      if (currentUserId) {
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

      console.log(
        `📱 Verifying payment for order ${orderId} by user ${currentUserId ? currentUserId : guestId}`,
      );

      let order;

      if (user) {
        order = await prisma.order.findFirst({
          where: {
            id: orderId,
            userId: user.id,
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
      } else if (guest) {
        order = await prisma.order.findFirst({
          where: {
            id: orderId,
            guestId: guest.id,
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
      } else {
        return res.status(404).json({ error: "User not found" });
      }

      if (!order) {
        console.log(`❌ Order ${orderId} not found for user ${userId}`);
        return res.status(404).json({
          success: false,
          message: "Order not found or unauthorized",
          isPaid: false,
        });
      }

      console.log(`📊 Order ${orderId} status:`, {
        isPaid: order.isPaid,
        status: order.status,
        paymentMethod: order.paymentMethod,
        hasPayment: !!order.payment,
        paymentStatus: order.payment?.paymentStatus,
      });

      return res.status(200).json({
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
              transactionType: order.payment.transactionType,
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
      console.log("❌ Verify order payment error:", error);
      return res.status(500).json({
        success: false,
        message: "Error verifying order payment",
        isPaid: false,
        error: error.message,
      });
    }
  },

  // Clear cart for successful M-Pesa payment
  async clearCartForSuccessfulPayment(req, res) {
    try {
      const currentUserId = req.userId;
      const guestId = req.guestId;
      const orderId = parseInt(req.params.orderId);

      let user;
      let guest;

      if (currentUserId) {
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
        // Verify the order exists, belongs to user, is M-Pesa, and is now paid
        const order = await prisma.order.findFirst({
          where: {
            id: orderId,
            userId: user.id,
            paymentMethod: "pay now with mpesa",
            isPaid: true,
          },
          include: {
            payment: true,
          },
        });

        if (!order) {
          return res.status(404).json({
            error: "Order not found or not a paid M-Pesa order",
          });
        }

        // Find and clear the cart
        const cart = await prisma.cart.findUnique({
          where: { userId: user.id },
          include: {
            items: true,
          },
        });

        if (cart && cart.items && cart.items.length > 0) {
          await prisma.cart.delete({
            where: { id: cart.id },
          });

          await prisma.cartItem.deleteMany({
            where: { cartId: cart.id },
          });

          console.log(`Cart cleared for successful M-Pesa order ${orderId}`);
        }

        return res.status(200).json({
          success: true,
          message: "Cart cleared for successful M-Pesa order",
        });
      } else if (guest) {
        // Verify the order exists, belongs to user, is M-Pesa, and is now paid
        const order = await prisma.order.findFirst({
          where: {
            id: orderId,
            guestId: guest.id,
            paymentMethod: "pay now with mpesa",
            isPaid: true,
          },
          include: {
            payment: true,
          },
        });

        if (!order) {
          return res.status(404).json({
            error: "Order not found or not a paid M-Pesa order",
          });
        }

        // Find and clear the cart
        const cart = await prisma.cart.findUnique({
          where: { guestId: guest.id },
          include: {
            items: true,
          },
        });

        if (cart && cart.items && cart.items.length > 0) {
          await prisma.cart.delete({
            where: { id: cart.id },
          });

          await prisma.cartItem.deleteMany({
            where: { cartId: cart.id },
          });

          console.log(`Cart cleared for successful M-Pesa order ${orderId}`);
        }

        return res.status(200).json({
          success: true,
          message: "Cart cleared for successful M-Pesa order",
        });
      } else {
        return res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      console.log("Clear cart for M-Pesa order error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  async debugPayment(req, res) {
    try {
      const orderId = parseInt(req.params.orderId);

      const order = await prisma.order.findFirst({
        where: { id: orderId },
        include: {
          payment: true,
        },
      });

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      return res.status(200).json({
        success: true,
        order: {
          id: order.id,
          isPaid: order.isPaid,
          status: order.status,
          paymentMethod: order.paymentMethod,
          payment: order.payment,
        },
      });
    } catch (error) {
      console.error("Debug error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  // Add to order.js controller
  async debugOrderStatus(req, res) {
    try {
      const orderId = parseInt(req.params.orderId);

      console.log(`🔍 Debugging order ${orderId}`);

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          payment: true,
          items: true,
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      if (!order) {
        return res.status(404).json({
          error: "Order not found",
        });
      }

      // Also check if payment exists in database
      const allPayments = await prisma.payment.findMany({
        where: {
          orderId: orderId,
        },
      });

      return res.status(200).json({
        success: true,
        order: {
          id: order.id,
          userId: order.userId,
          isPaid: order.isPaid,
          status: order.status,
          paymentMethod: order.paymentMethod,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        },
        payment: order.payment,
        allPayments: allPayments,
        user: order.user,
      });
    } catch (error) {
      console.error("Debug error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
};
