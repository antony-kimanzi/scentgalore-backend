// scripts/createAdmin.js
import { PrismaClient } from "@prisma/client";
import { passwordUtils } from "../utils/password.js";
import readline from "readline";

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function createAdmin() {
  try {
    console.log("=== Create Admin User ===");

    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "admin" },
    });

    if (existingAdmin) {
      console.log("❌ Admin user already exists!");
      rl.close();
      return;
    }

    // Get admin details
    rl.question("Email: ", async (email) => {
      rl.question("First Name: ", async (firstName) => {
        rl.question("Last Name: ", async (lastName) => {
          rl.question("Password: ", { silent: true }, async (password) => {
            // Validate email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
              console.log("❌ Invalid email format");
              rl.close();
              return;
            }

            // Validate password strength
            if (password.length < 8) {
              console.log("❌ Password must be at least 8 characters long");
              rl.close();
              return;
            }

            try {
              // Hash password
              const hashedPassword = await passwordUtils.hashPassword(password);

              // Create admin user
              const admin = await prisma.user.create({
                data: {
                  email,
                  firstName,
                  lastName,
                  username: firstName,
                  password: hashedPassword,
                  role: "admin",
                },
              });

              console.log("✅ Admin user created successfully!");
              console.log(`📧 Email: ${admin.email}`);
              console.log(`👤 Name: ${admin.firstName} ${admin.lastName}`);
              console.log(`🎯 Role: ${admin.role}`);
            } catch (error) {
              console.error("❌ Error creating admin:", error.message);
            } finally {
              rl.close();
              await prisma.$disconnect();
            }
          });
        });
      });
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Add this to package.json scripts:
// "create-admin": "node scripts/createAdmin.js"

createAdmin();
