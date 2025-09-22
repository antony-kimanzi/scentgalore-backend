import prisma from "../lib/prisma";

export const orderController = {
  async createOrder(req, res) {
    try {
      const currentUserId = req.userId;
      const cartId = req.params.id;
      const { orderData } = req.validatedData;

      const shippingData = orderData.shipping;
      const billingData = orderData.billing;

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
          totalAmount: orderData.totalAmount,
          paymentMethod: orderData.paymentMethod,
          shippingMethod: orderData.shippingMethod,
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
          firstName: shippingData.firstName,
          lastName: shippingData.lastName,
          email: shippingData.email,
          city: shippingData.city,
          phoneNumber: shippingData.phoneNumber,
        },
        select: {
          id: true,
          orderId: true,
          firstName: true,
          lastName: true,
          email: true,
          city: true,
          phoneNumber: true,
        },
      });

      let billingDetail;

      if (billingData) {
        billingDetail = await prisma.billingDetail.create({
          data: {
            orderId: order.id,
            firstName: billingData.firstName,
            lastName: billingData.lastName,
            email: billingData.email,
            city: billingData.city,
            phoneNumber: billingData.phoneNumber,
          },
          select: {
            id: true,
            orderId: true,
            firstName: true,
            lastName: true,
            email: true,
            city: true,
            phoneNumber: true,
          },
        });
      } else {
        billingDetail = await prisma.billingDetail.create({
          data: {
            orderId: order.id,
            firstName: shippingData.firstName,
            lastName: shippingData.lastName,
            email: shippingData.email,
            city: shippingData.city,
            phoneNumber: shippingData.phoneNumber,
          },
          select: {
            id: true,
            orderId: true,
            firstName: true,
            lastName: true,
            email: true,
            city: true,
            phoneNumber: true,
          },
        });
      }

      const orderItems = await prisma.orderItem.createMany({
        data: cart.items.map((cartItem) => ({
          orderId: order.id,
          productId: cartItem.productId,
          quantity: cartItem.quantity,
          price: cartItem.price,
        })),
        skipDuplicates: true,
      });

      await prisma.cart.delete({ where: { id: cartId } });
      return res
        .status(201)
        .json(order, shippingDetail, billingDetail, orderItems);
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  },
};
