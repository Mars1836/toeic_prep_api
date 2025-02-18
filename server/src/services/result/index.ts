import { BadRequestError } from "../../errors/bad_request_error";
import { NotFoundError } from "../../errors/not_found_error";
import { FlashcardAttr, FlashcardModel } from "../../models/flashcard.model";
import { ResultAttr, resultModel } from "../../models/result.model";
import { ResultItemAttr } from "../../models/result_item.model";
import { testModel } from "../../models/test.model";
import { formatDate, getStartOfPeriod } from "../../utils";
import ResultItemRepo from "../result_item/repos";
import SetFlashcardUtil from "../set_flashcard/repos";
import TestSrv from "../test";
import TestRepo from "../test/repos";
import UserRepo from "../user/repos";

namespace ResultSrv {
  export async function create(data: ResultAttr) {
    const isExist = await TestRepo.checkExist(data.testId);
    if (!isExist) {
      throw new BadRequestError("Bài test không tồn tại.");
    }
    const newResult = await resultModel.create(data);
    return newResult;
  }
  export async function creataWithItems(data: {
    rs: ResultAttr;
    rsis: ResultItemAttr[];
  }) {
    const test = await testModel.findById(data.rs.testId);
    if (!test) {
      throw new BadRequestError("Bài test không tồn tại.");
    }
    data.rs.testType = test.type;
    data.rs.numberOfUserAnswers = data.rsis.length;
    data.rs.numberOfCorrectAnswers = data.rsis.filter((item) => {
      return item.useranswer === item.correctanswer;
    }).length;
    const newResult = await resultModel.create(data.rs); // result
    let rsItems;

    if (newResult) {
      rsItems = data.rsis.map((item) => {
        return {
          ...item,
          resultId: newResult.id,
          testId: data.rs.testId,
          testType: data.rs.testType,
          userId: data.rs.userId,
        };
      }) as ResultItemAttr[];
    }
    console.log(rsItems);
    const newResults = await ResultItemRepo.createMany(rsItems!);
    await TestRepo.addAttempt(data.rs.testId, data.rs.userId);
    return newResult;
  }
  export async function getByUser(data: {
    userId: string;
    limit?: number;
    skip?: number;
  }) {
    const isExist = await UserRepo.checkExist(data.userId);
    if (!isExist) {
      throw new BadRequestError("Người dùng không tồn tại");
    }
    const result = await resultModel
      .find({
        userId: data.userId,
      })
      .populate("testId")
      .sort({ createdAt: -1 })
      .skip(data.skip || 0)
      .limit(data.limit || 3);
    return result;
  }
  export async function getByTest(data: {
    userId: string;
    testId: string;
    limit?: number;
    skip?: number;
  }) {
    if (!data.testId) {
      throw new NotFoundError("TestId phải được cung cấp");
    }
    if (!data.userId) {
      throw new NotFoundError("UserId phải được cung cấp");
    }
    const rs = await resultModel
      .find({
        userId: data.userId,
        testId: data.testId,
      })
      .populate("testId")
      .sort({ createdAt: -1 })
      .skip(data.skip || 0)
      .limit(data.limit || 3);
    return rs;
  }
  export async function getById(data: { userId: string; id?: string }) {
    if (!data.id) {
      throw new NotFoundError("Id phải được cung cấp");
    }
    if (!data.userId) {
      throw new NotFoundError("UserId phải được cung cấp");
    }
    const rs = await resultModel.findOne({
      userId: data.userId,
      _id: data.id,
    });
    return rs;
  }
  export async function deleteById(data: { userId: string; id?: string }) {
    if (!data.id) {
      throw new NotFoundError("Id phải được cung cấp");
    }
    if (!data.userId) {
      throw new NotFoundError("UserId phải được cung cấp");
    }
    const rs = await resultModel.deleteOne({
      userId: data.userId,
      _id: data.id,
    });
    await ResultItemRepo.deleteMany(data.id);
    return rs;
  }
  export async function getNewResultAnalyst_(step: number, num: number) {
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

    const actualData = await resultModel.aggregate([
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
  export async function getNewResultAnalyst(step: number, num: number) {
    const currentDate = new Date();

    const startDate = new Date(currentDate);
    startDate.setDate(currentDate.getDate() - step * num);
    const periodStart = getStartOfPeriod(startDate, step);

    const result = await resultModel.aggregate([
      {
        $match: {
          createdAt: { $gte: periodStart },
        },
      },
      {
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
        $group: {
          _id: "$periodStart",
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    const formattedResult = [];
    let currentPeriod = new Date(periodStart);
    let previousAmount = null;

    for (let i = 0; i < num; i++) {
      const periodEnd = new Date(currentPeriod);
      periodEnd.setDate(periodEnd.getDate() + step - 1);

      const periodData = result.find(
        (item) => item._id.getTime() === currentPeriod.getTime()
      );

      const currentCount = periodData ? periodData.count : 0;

      let growthRate = null;
      if (previousAmount !== null && previousAmount !== 0) {
        growthRate = ((currentCount - previousAmount) / previousAmount) * 100;
      } else if (previousAmount === 0 && currentCount !== 0) {
        growthRate = 100;
      } else if (previousAmount === 0 && currentCount === 0) {
        growthRate = 0;
      }

      formattedResult.push({
        period: `${formatDate(currentPeriod)} - ${formatDate(periodEnd)}`,
        startDate: currentPeriod.toISOString(),
        endDate: periodEnd.toISOString(),
        totalAmount: currentCount,
        count: periodData ? periodData.count : 0,
        growthRate: growthRate !== null ? Number(growthRate.toFixed(2)) : null,
        previousAmount: previousAmount,
      });

      previousAmount = currentCount;

      currentPeriod.setDate(currentPeriod.getDate() + step);
    }

    return formattedResult;
  }
  export async function getUserProgressAnalyst(step: number, num: number) {
    const totalResult = await resultModel.countDocuments();
    return {
      totalResult,
    };
  }
}
export default ResultSrv;
