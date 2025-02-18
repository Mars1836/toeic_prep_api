import { TransactionStatus } from "../../configs/enum";
import { transactionModel } from "../../models/transaction.model";

import { TransactionAttr } from "../../models/transaction.model";
import { formatDate, getStartOfPeriod } from "../../utils";
import UserRepo from "../user/repos";
namespace TransactionSrv {
  export async function updateStatus(id: string, status: TransactionStatus) {
    const oldTransaction = await transactionModel.findOne({ providerId: id });
    if (!oldTransaction) {
      throw new Error("Transaction not found");
    }
    if (oldTransaction?.status === status) {
      return oldTransaction;
    }
    if (status === TransactionStatus.success) {
      await UserRepo.upgrade(oldTransaction?.userId);
    }
    const transaction = await transactionModel.findOneAndUpdate(
      { providerId: id },
      { status },
      { new: true }
    );
    return transaction;
  }
  export async function create(data: TransactionAttr) {
    const initData = {
      ...data,
      status: TransactionStatus.pending,
    };
    const newTransaction = await transactionModel.create(initData);
    return newTransaction;
  }
  export async function updateByProviderId(
    providerId: string,
    data: Partial<TransactionAttr>
  ) {
    const updatedTransaction = await transactionModel.findOneAndUpdate(
      { providerId },
      data,
      {
        new: true,
      }
    );
    return updatedTransaction;
  }
  export async function getTransactionsLast7Months() {
    const now = new Date();
    const sevenMonthsAgo = new Date();
    sevenMonthsAgo.setMonth(now.getMonth() - 7);

    const stats = await transactionModel.aggregate([
      // Lọc giao dịch trong 7 tháng trước
      {
        $match: {
          createdAt: { $gte: sevenMonthsAgo, $lte: now },
        },
      },
      // Nhóm theo tháng và năm
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
          },
          totalAmount: { $sum: "$amount" }, // Tổng số tiền giao dịch
          count: { $sum: 1 }, // Tổng số giao dịch
        },
      },
      // Sắp xếp theo thứ tự thời gian
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    return stats;
  }
  export async function getTransactionLast7Days() {
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    const stats = await transactionModel.aggregate([
      // Lọc giao dịch trong 7 ngày trước
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo, $lte: now },
        },
      },
      // Nhóm theo ngày
      {
        $group: {
          _id: {
            day: { $dayOfMonth: "$createdAt" },
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
          },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      // Sắp xếp theo ngày
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    return stats;
  }
  export async function getTransactionLast7Years() {
    const now = new Date();
    const sevenYearsAgo = new Date();
    sevenYearsAgo.setFullYear(now.getFullYear() - 7);

    const stats = await transactionModel.aggregate([
      // Lọc giao dịch trong 7 năm trước
      {
        $match: {
          createdAt: { $gte: sevenYearsAgo, $lte: now },
        },
      },
      // Nhóm theo năm
      {
        $group: {
          _id: { year: { $year: "$createdAt" } },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      // Sắp xếp theo năm
      { $sort: { "_id.year": 1 } },
    ]);

    return stats;
  }
  export async function getTransactions(query: any) {
    const transactions = await transactionModel
      .find(query)
      .populate("userId")
      .sort({ createdAt: -1 });
    return transactions;
  }
  export async function getNewTransactionAnalyst_(step: number, num: number) {
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

    const actualData = await transactionModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: now },
        },
      },
      {
        $group: {
          _id: filterGroup,
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },

      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);
    const dataMap: { [key: string]: { count: number; totalAmount: number } } =
      {};
    actualData.forEach((item) => {
      let key = "";
      if (dv === "d") {
        key = `${item._id.year}-${item._id.month}-${item._id.day}`;
      } else if (dv === "m") {
        key = `${item._id.year}-${item._id.month}`;
      } else if (dv === "y") {
        key = `${item._id.year}`;
      }
      dataMap[key] = {
        count: item.count,
        totalAmount: item.totalAmount,
      };
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
        count: dataMap[key]?.count || 0,
        totalAmount: dataMap[key]?.totalAmount || 0,
      };
    });

    return result;
  }
  export async function getNewTransactionAnalyst(step: number, num: number) {
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
          status: TransactionStatus.success,
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
        // Nhóm theo period và tính tổng amount
        $group: {
          _id: "$periodStart",
          totalAmount: { $sum: "$amount" },
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

    // Format lại kết quả và tính growth rate
    const formattedResult = [];
    let currentPeriod = new Date(periodStart);
    let previousAmount = null;

    for (let i = 0; i < num; i++) {
      const periodEnd = new Date(currentPeriod);
      periodEnd.setDate(periodEnd.getDate() + step - 1);

      // Tìm data tương ứng trong result
      const periodData = result.find(
        (item) => item._id.getTime() === currentPeriod.getTime()
      );

      const currentAmount = periodData ? periodData.totalAmount : 0;

      // Tính growth rate
      let growthRate = null;
      if (previousAmount !== null && previousAmount !== 0) {
        growthRate = ((currentAmount - previousAmount) / previousAmount) * 100;
      } else if (previousAmount === 0 && currentAmount !== 0) {
        growthRate = 100;
      } else if (previousAmount === 0 && currentAmount === 0) {
        growthRate = 0;
      }

      formattedResult.push({
        period: `${formatDate(currentPeriod)} - ${formatDate(periodEnd)}`,
        startDate: currentPeriod.toISOString(),
        endDate: periodEnd.toISOString(),
        totalAmount: currentAmount,
        count: periodData ? periodData.count : 0,
        growthRate: growthRate !== null ? Number(growthRate.toFixed(2)) : null, // Làm tròn đến 2 chữ số thập phân
        previousAmount: previousAmount, // Optional, có thể bỏ nếu không cần
      });

      // Lưu lại amount hiện tại để tính growth rate cho period tiếp theo
      previousAmount = currentAmount;

      // Chuyển sang period tiếp theo
      currentPeriod.setDate(currentPeriod.getDate() + step);
    }

    return formattedResult;
  }
  export async function getProgressTransactionAnalyst() {
    const totalAmount = await transactionModel.aggregate([
      {
        $match: { status: TransactionStatus.success },
      },
      {
        $group: {
          _id: null, // Không phân nhóm theo bất kỳ trường nào
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);
    const numSuccessTransaction = await transactionModel.countDocuments({
      status: TransactionStatus.success,
    });
    return {
      totalAmount: totalAmount[0].totalAmount,
      totalTransaction: numSuccessTransaction,
    };
  }
}

export default TransactionSrv;
