import prisma from "../lib/prisma.js";

export const productController = {
  async addProduct(req, res) {
    try {
      const product = req.validatedData;

      const existingProduct = await prisma.product.findUnique({
        where: { name: product.name },
      });
      if (existingProduct) {
        return res.status(409).json({ error: "Product already exists" });
      }

      const newProduct = await prisma.product.create({
        data: {
          name: product.name,
          shortDescription: product.shortDescription,
          description: product.description,
          price: product.price,
          imageUrl: product.imageUrl,
          category: product.category,
        },
        select: {
          id: true,
          shortDescription: true,
          description: true,
          price: true,
          imageUrl: true,
          category: true,
          createdAt: true,
        },
      });

      return res.status(201).json({ newProduct });
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ msg: "Internal server error", error: error || null });
    }
  },

  async getProduct(req, res) {
    try {
      const id = req.params.id;
      const product = await prisma.product.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          shortDescription: true,
          description: true,
          price: true,
          imageUrl: true,
          category: true,
        },
      });

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      return res.status(200).json({ product });
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  async getAllProducts(req, res) {
    try {
      const products = await prisma.product.findMany();

      if (products.length === 0) {
        return res.status(404).json({ message: "No product found" });
      }

      return res.status(200).json(products);
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  async updateProduct(req, res) {
    try {
      const id = req.params.id;
      const { updatedData } = req.validatedData;

      const product = await prisma.product.findUnique({
        where: { id },
      });

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      const updatedProduct = await prisma.product.update({
        where: { id },
        data: { updatedData },
        select: {
          id: true,
          name: true,
          shortDescription: true,
          description: true,
          price: true,
          imageUrl: true,
          category: true,
          updatedAt: true,
        },
      });

      return res.status(200).json(updatedProduct);
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  async deleteProduct(req, res) {
    try {
      const id = req.params.id;

      const product = await prisma.product.findUnique({ where: { id } });

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      await prisma.product.delete({ where: { id } });

      return res.status(204).end();
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  },
};
