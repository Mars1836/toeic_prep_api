import { UserAttr, userModel, UserTargetScore } from "../../models/user.model";
import bcrypt from "bcryptjs";
import * as _ from "lodash";
import jwt from "jsonwebtoken";
import { constEnv } from "../../configs/const";
import { BadRequestError } from "../../errors/bad_request_error";
import { transactionModel } from "../../models/transaction.model";
import { formatDate, getStartOfPeriod } from "../../utils";
async function localCreate(data: {
  email: string;
  password: string;
  name: string;
}) {
  const checkEmail = await userModel.findOne({ email: data.email });

  if (checkEmail) {
    throw new BadRequestError("Email in use");
  }
  data.password = await bcrypt.hash(
    data.password,
    parseInt(constEnv.passwordSalt!)
  );
  // Store hash in your password DB.
  const user = await userModel.create(data);

  return user;
}
async function googleCreate(data: {
  googleId: string;
  name: string;
  email: string;
}) {
  const user = await userModel.create(data);
  return user;
}
async function facebookCreate(data: { facebookId: string; name: string }) {
  const user = await userModel.create(data);
  return user;
}
async function localLogin(data: { email: string; password: string }) {
  const user = await userModel.findOne({
    email: data.email,
  });
  if (!user) {
    throw new BadRequestError("Email or password is wrong");
  }
  const verify = await bcrypt.compare(data.password, user.password as string);

  if (!verify) {
    throw new BadRequestError("Email or password is wrong");
  }

  return user;
}
async function updateAvatar(id: string, avatar: string) {
  const user = await userModel.findByIdAndUpdate(id, { avatar }, { new: true });
  return user;
}
async function updateProfile(id: string, data: { name: string; bio: string }) {
  const user = await userModel.findByIdAndUpdate(id, data, { new: true });
  return user;
}
export async function getById(id: string) {
  const user = await userModel.findById(id).select("-password");
  return user;
}
export async function updateTargetScore(
  id: string,
  { reading, listening }: { reading: number; listening: number }
) {
  const targetScore = {
    reading,
    listening,
  };
  const user = await userModel.findByIdAndUpdate(
    id,
    { targetScore },
    {
      new: true,
    }
  );
  return user;
}
export async function getAllUsers() {
  const users = await userModel.find({}).select("-password");

  return users;
}
export async function getUpgradeUsers() {
  const users = await userModel.find({
    upgradeExpiredDate: { $gt: new Date() },
  });
  return users;
}

export async function getTotalUserAnalyst() {
  const totalUser = await userModel.countDocuments();
  return totalUser;
}
export async function getNewUserAnalyst_(step: number, num: number) {
  // Lấy ngày hiện tại
  let dv: "d" | "w" | "m" | "y" = "d";
  if (step === 1) {
    dv = "d";
  } else if (step === 7) {
    dv = "w";
  } else if (step === 30) {
    dv = "m";
  } else if (step === 365) {
    dv = "y";
  }
  const now = new Date();
  // Tính ngày bắt đầu
  let startDate = new Date();
  let filterGroup = {};
  if (dv === "m") {
    startDate.setMonth(now.getMonth() - num);
    filterGroup = {
      month: { $month: "$createdAt" },
      year: { $year: "$createdAt" },
    };
  }
  if (dv === "y") {
    startDate.setFullYear(now.getFullYear() - num);
    filterGroup = {
      year: { $year: "$createdAt" },
    };
  }
  if (dv === "d") {
    startDate.setDate(now.getDate() - num);

    filterGroup = {
      day: { $dayOfMonth: "$createdAt" },
      month: { $month: "$createdAt" },
      year: { $year: "$createdAt" },
    };
  }
  const allInRange = [];
  let currentDate = new Date(startDate);
  while (currentDate <= now) {
    if (dv === "d") {
      allInRange.push({
        day: currentDate.getDate(),
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear(),
      });
      currentDate.setDate(currentDate.getDate() + 1);
    } else if (dv === "m") {
      allInRange.push({
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear(),
      });
      currentDate.setMonth(currentDate.getMonth() + 1);
    } else if (dv === "y") {
      allInRange.push({
        year: currentDate.getFullYear(),
      });
      currentDate.setFullYear(currentDate.getFullYear() + 1);
    }
  }

  const actualData = await userModel.aggregate([
    {
      // Lọc các user được tạo từ startDate
      $match: {
        createdAt: { $gte: startDate, $lte: now },
      },
    },

    {
      // Nhóm theo period
      $group: {
        _id: filterGroup,
        count: { $sum: 1 },
      },
    },

    // Sắp xếp theo thời gian
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
  ]);
  const dataMap: { [key: string]: number } = {};
  actualData.forEach((item) => {
    let key = "";
    if (dv === "d") {
      key = `${item._id.year}-${item._id.month}-${item._id.day}`;
    } else if (dv === "m") {
      key = `${item._id.year}-${item._id.month}`;
    } else if (dv === "y") {
      key = `${item._id.year}`;
    }
    dataMap[key] = item.count;
  });

  // Tạo kết quả cuối cùng với đầy đủ các tháng
  const result = allInRange.map((period) => {
    let key = "";
    if (dv === "d") {
      key = `${period.year}-${period.month}-${period.day}`;
    } else if (dv === "m") {
      key = `${period.year}-${period.month}`;
    } else if (dv === "y") {
      key = `${period.year}`;
    }
    return {
      _id: period,
      count: dataMap[key] || 0, // Nếu không có dữ liệu, count = 0
    };
  });

  return result;
}
export async function getNewUserAnalyst(step: number, num: number) {
  // Lấy ngày hiện tại
  // Lấy ngày hiện tại
  let dv;
  if (step === 1) {
    dv = "d";
  } else if (step === 7) {
    dv = "w";
  } else if (step === 30) {
    dv = "m";
  } else if (step === 365) {
    dv = "y";
  }
  const currentDate = new Date();

  // Tính ngày bắt đầu
  const startDate = new Date(currentDate);
  startDate.setDate(currentDate.getDate() - step * num);
  const periodStart = getStartOfPeriod(startDate, step);

  const result = await userModel.aggregate([
    {
      // Lọc các user được tạo từ startDate
      $match: {
        createdAt: { $gte: periodStart },
      },
    },
    {
      // Thêm trường period để nhóm
      $addFields: {
        periodStart: {
          $subtract: [
            { $toDate: "$createdAt" },
            {
              $mod: [
                { $subtract: [{ $toDate: "$createdAt" }, periodStart] },
                step * 24 * 60 * 60 * 1000,
              ],
            },
          ],
        },
      },
    },
    {
      // Nhóm theo period
      $group: {
        _id: "$periodStart",
        count: { $sum: 1 },
      },
    },
    {
      // Sắp xếp theo thời gian
      $sort: {
        _id: 1,
      },
    },
  ]);

  // Format lại kết quả
  const formattedResult = [];
  let currentPeriod = new Date(periodStart);

  for (let i = 0; i < num; i++) {
    const periodEnd = new Date(currentPeriod);
    periodEnd.setDate(periodEnd.getDate() + step - 1);

    // Tìm data tương ứng trong result
    const periodData = result.find(
      (item) => item._id.getTime() === currentPeriod.getTime()
    );

    formattedResult.push({
      period: `${formatDate(currentPeriod)} - ${formatDate(periodEnd)}`,
      startDate: currentPeriod.toISOString(),
      endDate: periodEnd.toISOString(),
      count: periodData ? periodData.count : 0,
    });

    // Chuyển sang period tiếp theo
    currentPeriod.setDate(currentPeriod.getDate() + step);
  }

  return formattedResult;
}
export async function getUpgradeUserAnalyst(step: number, num: number) {
  // Lấy ngày hiện tại
  const currentDate = new Date();

  // Tính ngày bắt đầu
  const startDate = new Date(currentDate);
  startDate.setDate(currentDate.getDate() - step * num);
  const periodStart = getStartOfPeriod(startDate, step);

  const result = await transactionModel.aggregate([
    {
      // Lọc các transaction từ startDate
      $match: {
        createdAt: { $gte: periodStart },
      },
    },
    {
      // Thêm trường period để nhóm
      $addFields: {
        periodStart: {
          $subtract: [
            { $toDate: "$createdAt" },
            {
              $mod: [
                { $subtract: [{ $toDate: "$createdAt" }, periodStart] },
                step * 24 * 60 * 60 * 1000,
              ],
            },
          ],
        },
      },
    },
    {
      // Nhóm theo period và đếm số lượng userId unique
      $group: {
        _id: {
          period: "$periodStart",
          userId: "$userId", // Thêm userId vào _id để nhóm
        },
      },
    },
    {
      // Nhóm lại theo period và đếm số lượng unique users
      $group: {
        _id: "$_id.period",
        count: { $sum: 1 }, // Đếm số lượng nhóm unique (userId)
      },
    },
    {
      // Sắp xếp theo thời gian
      $sort: {
        _id: 1,
      },
    },
  ]);

  // Format lại kết quả
  const formattedResult = [];
  let currentPeriod = new Date(periodStart);

  for (let i = 0; i < num; i++) {
    const periodEnd = new Date(currentPeriod);
    periodEnd.setDate(periodEnd.getDate() + step - 1);

    // Tìm data tương ứng trong result
    const periodData = result.find(
      (item) => item._id.getTime() === currentPeriod.getTime()
    );

    formattedResult.push({
      period: `${formatDate(currentPeriod)} - ${formatDate(periodEnd)}`,
      startDate: currentPeriod.toISOString(),
      endDate: periodEnd.toISOString(),
      count: periodData ? periodData.count : 0,
    });

    // Chuyển sang period tiếp theo
    currentPeriod.setDate(currentPeriod.getDate() + step);
  }

  return formattedResult;
}
export async function getUserProgressAnalyst() {
  const totalUser = await userModel.find({}).countDocuments();
  const premiumUser = await userModel
    .find({
      upgradeExpiredDate: { $gt: new Date() },
    })
    .countDocuments();

  return { totalUser, premiumUser };
}
export const userSrv = {
  localCreate,
  localLogin,
  googleCreate,
  facebookCreate,
  getById,
  updateProfile,
  updateAvatar,
  updateTargetScore,
  getAllUsers,
  getUpgradeUsers,
  getNewUserAnalyst_,
  getNewUserAnalyst,
  getUpgradeUserAnalyst,
  getUserProgressAnalyst,
};
export async function hashPassword(password: string) {
  return await bcrypt.hash(password, parseInt(constEnv.passwordSalt!));
}
