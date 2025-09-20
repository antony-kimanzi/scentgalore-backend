import prisma from "../lib/prisma.js";

export const cartItemController = {
  async addItem(req, res) {
    try {
      const id = req.userId;
      const productId = req.params.id;

      let userCart;
      userCart = await prisma.cart.findUnique({ where: { userId: id } });

      if (!userCart) {
        userCart = await prisma.cart.create({
          data: {
            userId: id,
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

      const createdItem = await prisma.cartItem.create({
        data: {
          cartId: userCart.id,
          productId: product.id,
          quantity: 1,
          price: product.price,
        },
        select: {
          id: true,
          cartId: true,
          productId: true,
          quantity: true,
          price: true,
          createdAt: true,
        },
      });

      return res.status(201).json(createdItem);
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  async updateItem(req, res) {
    try {
      const id = req.userId;
      const productId = req.params.id;
      const { quantity } = req.validatedData;

      const userCart = await prisma.cart.findUnique({ where: { userId: id } });

      if (!userCart) {
        return res.status(404).json({ error: "User has no cart" });
      }

      const existingItem = await prisma.cartItem.findFirst({
        where: { cartId: userCart.id, productId: productId },
      });

      if (!existingItem) {
        return res.status(404).json({ error: "Cart item not found" });
      }

      const newPrice = existingItem.price * quantity;
      const updatedItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: quantity, price: newPrice },
        select: {
          id: true,
          cartId: true,
          productId: true,
          quantity: true,
          price: true,
          createdAt: true,
        },
      });

      return res.status(200).json(updatedItem);
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  async deleteItem(req, res) {
    try {
      const id = req.userId;
      const productId = req.params.id;

      const userCart = await prisma.cart.findUnique({ where: { userId: id } });

      if (!userCart) {
        return res.status(404).json({ error: "User has no cart" });
      }

      const existingItem = await prisma.cartItem.findFirst({
        where: { cartId: userCart.id, productId: productId },
      });

      if (!existingItem) {
        return res.status(404).json({ error: "Cart item not found" });
      }

      await prisma.cartItem.delete({ where: { id: existingItem.id } });

      return res.status(204).end();
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  },
};
