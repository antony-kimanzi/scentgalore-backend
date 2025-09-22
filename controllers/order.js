import prisma from "../lib/prisma.js";

export const orderController = {
  async createOrder(req, res) {
    try {
      const currentUserId = req.userId;
      const cartId = req.params.id;
      const orderData = req.validatedData;

      const { shipping, billing, ...orderMainData } = orderData;

      const cart = await prisma.cart.findUnique({
        where: { id: cartId },
        include: {
          items: {
            select: {
              id: true,
              cartId: true,
              productId: true,
              quantity: true,
              price: true,
            },
          },
        },
      });

      if (!cart) {
        return res.status(404).json({ error: "Cart not found" });
      }

      const order = await prisma.order.create({
        data: {
          userId: currentUserId,
          totalAmount: orderMainData.totalAmount,
          paymentMethod: orderMainData.paymentMethod,
          shippingMethod: orderMainData.shippingMethod,
        },
        select: {
          id: true,
          userId: true,
          totalAmount: true,
          status: true,
          paymentMethod: true,
          shippingMethod: true,
          createdAt: true,
        },
      });

      const shippingDetail = await prisma.shippingDetail.create({
        data: {
          orderId: order.id,
          firstName: shipping.firstName,
          lastName: shipping.lastName,
          email: shipping.email,
          city: shipping.city,
          phoneNumber: shipping.phoneNumber,
          apartment: shipping.apartment, // Added apartment field
        },
        select: {
          id: true,
          orderId: true,
          firstName: true,
          lastName: true,
          email: true,
          city: true,
          phoneNumber: true,
          apartment: true,
        },
      });

      const billingData = billing || shipping;
      const billingDetail = await prisma.billingDetail.create({
        data: {
          orderId: order.id,
          firstName: billingData.firstName,
          lastName: billingData.lastName,
          email: billingData.email,
          city: billingData.city,
          phoneNumber: billingData.phoneNumber,
          apartment: billingData.apartment, // Added apartment field
        },
        select: {
          id: true,
          orderId: true,
          firstName: true,
          lastName: true,
          email: true,
          city: true,
          phoneNumber: true,
          apartment: true,
        },
      });

      await prisma.orderItem.createMany({
        data: cart.items.map((cartItem) => ({
          orderId: order.id,
          productId: cartItem.productId,
          quantity: cartItem.quantity,
          price: cartItem.price,
        })),
        skipDuplicates: true,
      });

      const createdOrderItems = await prisma.orderItem.findMany({
        where: {
          orderId: order.id,
        },
        select: {
          id: true,
          orderId: true,
          productId: true,
          quantity: true,
          price: true,
          createdAt: true,
        },
      });

      await prisma.cart.delete({ where: { id: cartId } });
      return res
        .status(201)
        .json(order, shippingDetail, billingDetail, createdOrderItems);
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  async updateOrder(req, res) {
    try {
      const currentUserId = req.userId;
      const orderId = req.params.id;
      const { status, paymentMethod, shippingMethod, totalAmount } =
        req.validatedData;

      const order = await prisma.order.findFirst({
        where: { id: orderId, userId: currentUserId },
      });

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          status: status,
          paymentMethod: paymentMethod,
          shippingMethod: shippingMethod,
          totalAmount: totalAmount,
        },
        select: {
          id: true,
          userId: true,
          status: true,
          paymentMethod: true,
          shippingMethod: true,
          totalAmount: true,
          updatedAt: true,
        },
      });

      return res.status(200).json(updatedOrder);
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  async getOrder(req, res) {
    try {
      const currentUserId = req.userId;
      const orderId = req.params.id;

      const order = await prisma.order.findFirst({
        where: { id: orderId, userId: currentUserId },
        include: {
          items: {
            select: {
              id: true,
              orderId: true,
              productId: true,
              quantity: true,
              price: true,
              createdAt: true,
            },
          },
          shipping: {
            select: {
              id: true,
              orderId: true,
              firstName: true,
              lastName: true,
              email: true,
              city: true,
              phoneNumber: true,
            },
          },
          billing: {
            select: {
              id: true,
              orderId: true,
              firstName: true,
              lastName: true,
              email: true,
              city: true,
              phoneNumber: true,
            },
          },
        },
      });

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      return res.status(200).json(order);
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  async deleteOrder(req, res) {
    try {
      const currentUserId = req.userId;
      const orderId = req.params.id;

      const order = await prisma.order.findFirst({
        where: { id: orderId, userId: currentUserId },
      });

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      await prisma.order.delete({ where: { id: order.id } });

      return res.status(204).end();
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  },
};
