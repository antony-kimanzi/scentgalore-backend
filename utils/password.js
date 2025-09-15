import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

export const passwordUtils = {
  async hashPassword(plainPassword) {
    try {
      const salt = await bcrypt.genSalt(SALT_ROUNDS);
      const hashedPassword = await bcrypt.hash(plainPassword, salt);
      return hashedPassword;
    } catch (error) {
      return new Error("Error hashing password");
    }
  },

  async comparePassword(plainPassword, hashedPassword) {
    try {
      const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
      return isMatch;
    } catch (error) {
      throw new Error("Error comparing passwords");
    }
  },

  isPasswordStrong(password) {
    const strongRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%&])[a-zA-Z\d!@#$%&]{8,}$/;
    return strongRegex.test(password);
  },
};
