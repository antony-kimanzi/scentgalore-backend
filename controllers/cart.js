import prisma from "../lib/prisma.js";

export const cartController = {
  async getCart(req, res) {
    try {
      const currentUserId = req.userId;
      const guestId = req.guestId;

      let user;
      let guest;
      // Verify order belongs to user

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
          where: { userId: user.id },
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
          },
        });

        if (!cart) {
          return res.status(404).json({ error: "Cart not found" });
        }

        const total = cart.items.reduce((sum, item) => {
          return sum + Number(item.price) * item.quantity;
        }, 0);

        // Format to 2 decimal places
        const formattedTotal = parseFloat(total.toFixed(2));

        return res.status(200).json({
          cart,
          total: formattedTotal,
        });
      } else if (guest) {
        const cart = await prisma.cart.findUnique({
          where: { guestId: guest.id },
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
          },
        });

        if (!cart) {
          return res.status(404).json({ error: "Cart not found" });
        }

        const total = cart.items.reduce((sum, item) => {
          return sum + Number(item.price) * item.quantity;
        }, 0);

        // Format to 2 decimal places
        const formattedTotal = parseFloat(total.toFixed(2));

        return res.status(200).json({
          cart,
          total: formattedTotal,
        });
      } else {
        return res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  async deleteCart(req, res) {
    try {
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

      if (user) {
        const userCart = await prisma.cart.findUnique({
          where: { userId: user.id },
        });

        if (!userCart) {
          return res.status(404).json({ error: "User has no cart" });
        }

        await prisma.cart.delete({ where: { id: userCart.id } });

        return res.status(204).json({ success: true });
      } else if (guest) {
        const userCart = await prisma.cart.findUnique({
          where: { guestId: guest.id },
        });

        if (!userCart) {
          return res.status(404).json({ error: "User has no cart" });
        }

        await prisma.cart.delete({ where: { id: userCart.id } });

        return res.status(204).json({ success: true });
      } else {
        return res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  },
};
