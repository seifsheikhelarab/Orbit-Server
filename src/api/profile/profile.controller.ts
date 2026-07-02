import { type Response } from "express";
import prisma from "../../utils/prisma.js";
import { success, HttpStatus } from "../../utils/response.js";

export const profileController = {
  async getProfile(req: any, res: Response) {
    try {
      const userId = req.user.id;
      const profile = await prisma.userProfileData.findUnique({
        where: { userId }
      });
      return success(res, "Profile fetched successfully", HttpStatus.OK, profile);
    } catch (error) {
      throw error;
    }
  },

  async updateProfile(req: any, res: Response) {
    try {
      const userId = req.user.id;
      const { content } = req.body;
      
      const profile = await prisma.userProfileData.upsert({
        where: { userId },
        update: { content },
        create: { userId, content }
      });
      
      return success(res, "Profile updated successfully", HttpStatus.OK, profile);
    } catch (error) {
      throw error;
    }
  }
};
