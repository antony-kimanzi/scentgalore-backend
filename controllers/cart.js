import prisma from "../lib/prisma.js";

export const cartController = {
  async getCart(req, res) {
    try {
      const currentUserId = req.userId;
      const cart = await prisma.cart.findUnique({
        where: { userId: currentUserId },
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
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  async deleteCart(req, res) {
    try {
      const currentUserId = req.userId;

      const userCart = await prisma.cart.findUnique({
        where: { userId: currentUserId },
      });

      if (!userCart) {
        return res.status(404).json({ error: "User has no cart" });
      }

      await prisma.cart.delete({ where: { id: userCart.id } });

      return res.status(204).end();
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  },
};
