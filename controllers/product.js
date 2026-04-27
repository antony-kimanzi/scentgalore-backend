import prisma from "../lib/prisma.js";

export const productController = {
  async addProduct(req, res) {
    try {
      const productData = req.validatedData;

      const existingProduct = await prisma.product.findUnique({
        where: { name: productData.name },
      });
      if (existingProduct) {
        return res.status(409).json({ error: "Product already exists" });
      }

      const product = await prisma.product.create({
        data: {
          name: productData.name,
          shortDescription: productData.shortDescription,
          description: productData.description,
          price: productData.price,
          imageUrl: productData.imageUrl,
          category: productData.category,
          tone: productData.tone,
          stock: productData.stock,
        },
      });

      return res.status(201).json({ product });
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ msg: "Internal server error", error: error || null });
    }
  },

  async addManyProducts(req, res) {
    try {
      const products = req.body;

      if (products.length === 0) {
        return res.status(404).json({ error: "Products not found" });
      }

      await prisma.product.createMany({
        data: products.map((product) => ({
          name: product.name,
          shortDescription: product.shortDescription,
          description: product.description,
          price: product.price,
          imageUrl: product.imageUrl,
          category: product.category,
        })),
        skipDuplicates: true,
      });

      return res.status(201).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: "Internal server error", error });
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
          tone: true,
          category: true,
          stock: true,
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
      const products = await prisma.product.findMany({
        select: {
          id: true,
          name: true,
          shortDescription: true,
          description: true,
          price: true,
          imageUrl: true,
          tone: true,
          stock: true,
          category: true, // ADD THIS LINE
          createdAt: true,
          updatedAt: true,
        },
      });

      if (products.length === 0) {
        return res.status(404).json({ message: "No product found" });
      }

      return res.status(200).json({ products });
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  async updateProduct(req, res) {
    try {
      const id = req.params.id;
      const updatedData = req.validatedData;
      console.log(updatedData);

      const existingProduct = await prisma.product.findUnique({
        where: { id },
      });

      if (!existingProduct) {
        return res.status(404).json({ error: "Product not found" });
      }

      const product = await prisma.product.update({
        where: { id },
        data: {
          name: updatedData.name,
          shortDescription: updatedData.shortDescription,
          description: updatedData.description,
          price: updatedData.price,
          imageUrl: updatedData.imageUrl,
          category: updatedData.category,
          tone: updatedData.tone,
          stock: updatedData.stock,
        },
      });

      return res.status(201).json({ product });
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

      return res.status(204).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  },
};
