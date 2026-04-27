import prisma from "../lib/prisma.js";

export const cartItemController = {
  async addItem(req, res) {
    try {
      const currentUserId = req.userId;
      const guestId = req.guestId;
      const productId = req.params.id;

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
        let userCart;
        userCart = await prisma.cart.findUnique({ where: { userId: user.id } });

        if (!userCart) {
          userCart = await prisma.cart.create({
            data: {
              userId: user.id,
            },
            select: {
              id: true,
              userId: true,
              createdAt: true,
            },
          });
        }

        const product = await prisma.product.findUnique({
          where: { id: productId },
        });

        if (!product) {
          return res.status(404).json({ error: "Product not found" });
        }

        const item = await prisma.cartItem.create({
          data: {
            cartId: userCart.id,
            productId: product.id,
            quantity: 1,
            price: product.price,
          },

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
        });

        return res.status(201).json({ item });
      } else if (guest) {
        let userCart;
        userCart = await prisma.cart.findUnique({
          where: { guestId: guest.id },
        });

        if (!userCart) {
          userCart = await prisma.cart.create({
            data: {
              guestId: guest.id,
            },
            select: {
              id: true,
              userId: true,
              createdAt: true,
            },
          });
        }

        const product = await prisma.product.findUnique({
          where: { id: productId },
        });

        if (!product) {
          return res.status(404).json({ error: "Product not found" });
        }

        const item = await prisma.cartItem.create({
          data: {
            cartId: userCart.id,
            productId: product.id,
            quantity: 1,
            price: product.price,
          },

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
        });

        return res.status(201).json({ item });
      } else {
        return res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  async addItemQuantity(req, res) {
    try {
      const currentUserId = req.userId;
      const guestId = req.guestId;
      const cartItemId = req.params.id;

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

        const existingItem = await prisma.cartItem.findUnique({
          where: { id: cartItemId },
        });

        if (!existingItem) {
          return res.status(404).json({ error: "Cart item not found" });
        }

        const quantity = existingItem.quantity + 1;

        const item = await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: quantity },

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
        });

        return res.status(200).json({ item });
      } else if (guest) {
        const userCart = await prisma.cart.findUnique({
          where: { guestId: guest.id },
        });

        if (!userCart) {
          return res.status(404).json({ error: "User has no cart" });
        }

        const existingItem = await prisma.cartItem.findUnique({
          where: { id: cartItemId },
        });

        if (!existingItem) {
          return res.status(404).json({ error: "Cart item not found" });
        }

        const quantity = existingItem.quantity + 1;

        const item = await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: quantity },

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
        });

        return res.status(200).json({ item });
      } else {
        return res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  async subtractItemQuantity(req, res) {
    try {
      const currentUserId = req.userId;
      const guestId = req.guestId;
      const cartItemId = req.params.id;

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

        const existingItem = await prisma.cartItem.findUnique({
          where: { id: cartItemId },
        });

        if (!existingItem) {
          return res.status(404).json({ error: "Cart item not found" });
        }

        const quantity = existingItem.quantity - 1;

        const item = await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: quantity },

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
        });

        return res.status(200).json({ item });
      } else if (guest) {
        const userCart = await prisma.cart.findUnique({
          where: { guestId: guest.id },
        });

        if (!userCart) {
          return res.status(404).json({ error: "User has no cart" });
        }

        const existingItem = await prisma.cartItem.findUnique({
          where: { id: cartItemId },
        });

        if (!existingItem) {
          return res.status(404).json({ error: "Cart item not found" });
        }

        const quantity = existingItem.quantity - 1;

        const item = await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: quantity },

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
        });

        return res.status(200).json({ item });
      } else {
        return res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  async deleteItem(req, res) {
    try {
      const currentUserId = req.userId;
      const guestId = req.guestId;
      const cartItemId = req.params.id;

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

        const existingItem = await prisma.cartItem.findUnique({
          where: { id: cartItemId },
        });

        if (!existingItem) {
          return res.status(404).json({ error: "Cart item not found" });
        }

        await prisma.cartItem.delete({ where: { id: existingItem.id } });

        return res.status(204).json({ success: true });
      } else if (guest) {
        const userCart = await prisma.cart.findUnique({
          where: { guestId: guest.id },
        });

        if (!userCart) {
          return res.status(404).json({ error: "User has no cart" });
        }

        const existingItem = await prisma.cartItem.findUnique({
          where: { id: cartItemId },
        });

        if (!existingItem) {
          return res.status(404).json({ error: "Cart item not found" });
        }

        await prisma.cartItem.delete({ where: { id: existingItem.id } });

        return res.status(204).json({ success: true });
      } else {
        return res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  },
};
