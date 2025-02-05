import mongoose from "mongoose";
import { TestAttr, testModel } from "../../models/test.model";
import { result } from "lodash";
import { resultModel } from "../../models/result.model";
import * as XLSX from "xlsx";
import { cleanNullFieldObject } from "../../utils";
import { ORIGIN } from "../../configs";
import { userModel } from "../../models/user.model";
function getImage(name: string, code: string) {
  if (!name || name === "") {
    return null;
  }
  return ORIGIN + `/uploads/images/${code}/${name}.jpg`;
}
function getAudio(name: string, code: string) {
  if (!name || name === "") {
    return null;
  }
  return ORIGIN + `/uploads/audios/${code}/${name}.mp3`;
}
namespace TestSrv {
  export async function create(data: TestAttr) {
    const newTest = await testModel.create(data);
    return newTest;
  }
  export async function getAll() {
    const pipeline: any[] = [
      // Stage 1: Lookup để join với collection results
      {
        $lookup: {
          from: "results",
          localField: "_id",
          foreignField: "testId",
          as: "results",
        },
      },

      // Stage 2: Thêm trường attemptCount và userAttempt
      {
        $addFields: {
          attemptCount: { $size: "$results" },
        },
      },

      // Stage 3: Project để chọn các trường cần thiết và format
      {
        $project: {
          _id: 0,
          id: "$_id",
          title: 1,
          type: 1,
          code: 1,
          parts: 1,
          numberOfParts: 1,
          numberOfQuestions: 1,
          duration: 1,
          difficulty: 1,
          isPublished: 1,
          attemptCount: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },

      // Stage 4: Sort theo số lượt làm bài
      {
        $sort: { "userAttempt.lastSubmit": -1, createdAt: -1 },
      },
    ];

    // Thêm $skip và $limit nếu có

    // Thực hiện query
    const tests = await testModel.aggregate(pipeline);

    return tests;
  }
  export async function getByCode(code: string) {
    const rs = await testModel.findOne({
      code: code,
    });
    return rs;
  }
  export async function getById(id: string) {
    const rs = await testModel.findById(id);
    return rs;
  }
  export async function getByQuery(
    query: {
      id?: string;
      limit: number;
      skip: number;
    },
    userId?: string
  ) {
    let { skip = 0, limit = 4, ...filters } = query;
    skip = Number(skip);
    limit = Number(limit);
    const pipeline: any[] = [
      {
        $match: {
          isPublished: true,
        },
      },
      // Stage 1: Lookup để join với collection results
      {
        $lookup: {
          from: "results",
          localField: "_id",
          foreignField: "testId",
          as: "results",
        },
      },

      // Stage 2: Thêm trường attemptCount và userAttempt
      {
        $addFields: {
          attemptCount: { $size: "$results" },
          userAttempt: {
            $let: {
              vars: {
                userResults: {
                  $filter: {
                    input: "$results",
                    as: "result",
                    cond: {
                      $eq: [
                        "$$result.userId",
                        userId ? new mongoose.Types.ObjectId(userId) : null,
                      ],
                    },
                  },
                },
              },
              in: {
                count: { $size: "$$userResults" },
                lastTime: {
                  $max: "$$userResults.createdAt",
                },
              },
            },
          },
        },
      },

      // Stage 3: Project để chọn các trường cần thiết và format
      {
        $project: {
          _id: 0,
          id: "$_id",
          title: 1,
          type: 1,
          code: 1,
          parts: 1,
          numberOfParts: 1,
          numberOfQuestions: 1,
          duration: 1,
          difficulty: 1,
          isPublished: 1,
          attemptCount: 1,
          userAttempt: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },

      // Stage 4: Sort theo số lượt làm bài
      {
        $sort: { "userAttempt.lastSubmit": -1, createdAt: -1 },
      },
    ];

    // Thêm $skip và $limit nếu có
    if (skip) {
      pipeline.push({ $skip: skip });
    }
    if (limit) {
      pipeline.push({ $limit: limit });
    }

    // Thêm $match cho id cụ thể nếu có
    if (query.id) {
      pipeline.unshift({
        $match: { _id: new mongoose.Types.ObjectId(query.id) },
      });
    }

    // Thực hiện query
    const tests = await testModel.aggregate(pipeline);

    return tests;
  }
  export async function updateAll(updateData: object) {
    const rs = await testModel.updateMany(
      {}, // Filter criteria
      { ...updateData } // Data to update
    );
    return rs;
  }
  export async function handleExcel(id: string) {
    const rs = await testModel.findById(id);
    if (!rs) {
      throw new Error("Test not found");
    }
    const linkExcel = `http://localhost:4000/uploads/excels/${rs.code}/${rs.fileName}`;
    const response = await fetch(linkExcel);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
    });
    const list = [];
    if (jsonData.length > 1) {
      const header = jsonData[0] as string[];
      for (let i = 1; i < jsonData.length; i++) {
        const arr = jsonData[i] as string[];
        const questionItem = {
          id: arr[0],
          [header[0]]: arr[0] || null,
          [header[1]]: arr[1] || null,
          [header[2]]: arr[2] || null,
          [header[3]]: arr[3] || null,
          [header[4]]: arr[4] || null,
          [header[5]]: arr[5] || null,
          [header[6]]: arr[6] || null,
          [header[7]]: arr[7] || null,
          [header[8]]: arr[8] || null,
          [header[9]]: arr[9] || null,
        };
        questionItem.image = getImage(questionItem.image || "", rs.code);
        questionItem.audio = getAudio(questionItem.audio || "", rs.code);
        const filteredQuestionItem = cleanNullFieldObject(questionItem);
        const options = [arr[5], arr[6], arr[7], arr[8]];
        const labels = ["A", "B", "C", "D"];
        // @ts-ignore
        filteredQuestionItem.options = options
          .map((op, index) => {
            if (!op) {
              return null;
            }
            return {
              id: labels[index],
              content: op,
            };
          })
          .filter((option) => option !== null);
        list.push(filteredQuestionItem);
      }
    }
    return list;
  }

  export async function deleteTest(id: string) {
    const rs = await testModel.findByIdAndDelete(id);
    return rs;
  }
  export async function updateTest(id: string, data: object) {
    const rs = await testModel.findByIdAndUpdate(id, data);
    return rs;
  }
}
export default TestSrv;
