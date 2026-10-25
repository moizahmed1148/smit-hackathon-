import { Router } from "express";
import mongoose from "mongoose";
import { GoogleGenAI } from "@google/genai";
import Joi from "joi";

import { authenticate } from "../middleware/authMiddleware.js";

import User from "../Models/User.js";
import Attendance from "../Models/Attendance.js";
import LeaveRequest from "../Models/LeaveRequest.js";
import Payroll from "../Models/Payroll.js";
import Company from "../Models/Company.js";

const router = Router();

router.use(authenticate);

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    })
  : null;

const messageSchema = Joi.object({
  message: Joi.string().trim().min(1).max(4000).required(),
});

function getCompanyDate(date, timezone = "Asia/Karachi") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function getMonth(date, timezone = "Asia/Karachi") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value])
  );

  return `${values.year}-${values.month}`;
}

function containsAny(message, terms) {
  return terms.some((term) => message.includes(term));
}

/*
 * Fetch only the information needed for the current question.
 * Every query is scoped to the authenticated user's company.
 */
async function getRelevantContext(message, user) {
  const companyId = user.companyId;
  const userId = user.userId;
  const role = user.role;
  const isStaff = ["Admin", "HR"].includes(role);
  const normalized = message.toLowerCase();

  const company = await Company.findById(companyId).select("settings");

  const timezone = company?.settings?.timezone || "Asia/Karachi";
  const now = new Date();
  const today = getCompanyDate(now, timezone);
  const currentMonth = getMonth(now, timezone);

  const context = {
    currentDate: today,
    currentMonth,
    timezone,
    user: {
      role,
    },
    companySettings: company
      ? {
          officeStartTime: company.settings?.officeStartTime || "09:00",
          officeEndTime: company.settings?.officeEndTime || "17:00",
          gracePeriodMinutes: company.settings?.gracePeriodMinutes ?? 10,
          weekendDays: company.settings?.weekendDays || ["Sunday"],
        }
      : null,
    data: {},
  };

  const asksEmployees = containsAny(normalized, [
    "employee",
    "employees",
    "headcount",
    "workforce",
    "staff count",
    "department",
    "how many people",
  ]);

  const asksAttendance = containsAny(normalized, [
    "attendance",
    "present",
    "absent",
    "late",
    "check-in",
    "check in",
    "checked in",
    "check-out",
    "check out",
    "punctual",
  ]);

  const asksLeaves = containsAny(normalized, [
    "leave",
    "leaves",
    "time off",
    "vacation",
    "annual",
    "sick leave",
    "casual leave",
    "pending request",
  ]);

  const asksPayroll = containsAny(normalized, [
    "payroll",
    "salary",
    "salaries",
    "payslip",
    "paid",
    "deduction",
    "allowance",
    "net salary",
    "pay period",
  ]);

  const asksOwnData = containsAny(normalized, [
    "my ",
    "mine",
    "myself",
    "my own",
  ]);

  // Employee directory and headcount: HR/Admin only.
  if (asksEmployees && isStaff) {
    const [totalEmployees, activeEmployees, departments] =
      await Promise.all([
        User.countDocuments({
          company: companyId,
          role: "Employee",
        }),
        User.countDocuments({
          company: companyId,
          role: "Employee",
          isActive: true,
        }),
        User.aggregate([
  {
    $match: {
      company: new mongoose.Types.ObjectId(companyId),
      role: "Employee",
      isActive: true,
    },
  },
  {
    $group: {
      _id: { $ifNull: ["$department", "General"] },
      count: { $sum: 1 },
    },
  },
  { $sort: { count: -1 } },
])
      ]);

    context.data.employees = {
      totalEmployees,
      activeEmployees,
      inactiveEmployees: totalEmployees - activeEmployees,
      activeEmployeesByDepartment: departments.map((item) => ({
        department: item._id,
        count: item.count,
      })),
    };
  } else if (asksEmployees && !isStaff) {
    context.data.employeeDirectory = {
      available: false,
      message: "Employees can only access their own employee information.",
    };
  }

  // Attendance: employees see their own records; HR/Admin see company totals.
  if (asksAttendance) {
    const attendanceFilter = {
      company: companyId,
      date: today,
    };

    if (!isStaff) {
      attendanceFilter.employee = userId;
    }

    const records = await Attendance.find(attendanceFilter)
      .select("employee date checkIn checkOut status")
      .populate("employee", "name department")
      .limit(isStaff ? 500 : 30)
      .lean();

    if (isStaff) {
      context.data.todayAttendance = {
        totalRecords: records.length,
        present: records.filter((r) => r.status === "Present").length,
        late: records.filter((r) => r.status === "Late").length,
        absent: records.filter((r) => r.status === "Absent").length,
        checkedOut: records.filter((r) => Boolean(r.checkOut)).length,
        records: records.map((r) => ({
          employee: r.employee?.name || "Unknown",
          department: r.employee?.department || "General",
          checkIn: r.checkIn,
          checkOut: r.checkOut,
          status: r.status,
        })),
      };
    } else {
      context.data.myTodayAttendance = records.map((r) => ({
        date: r.date,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        status: r.status,
      }));
    }
  }

  // Leave records: employees see their own requests; HR/Admin see company requests.
  if (asksLeaves) {
    const leaveFilter = { company: companyId };

    if (!isStaff) {
      leaveFilter.employee = userId;
    }

    if (containsAny(normalized, ["pending", "awaiting approval"])) {
      leaveFilter.status = "Pending";
    }

    const leaves = await LeaveRequest.find(leaveFilter)
      .select("employee startDate endDate leaveType reason status createdAt")
      .populate("employee", "name department")
      .sort({ createdAt: -1 })
      .limit(isStaff ? 100 : 30)
      .lean();

    context.data.leaveRequests = leaves.map((leave) => ({
      employee: isStaff ? leave.employee?.name : undefined,
      department: isStaff ? leave.employee?.department : undefined,
      startDate: leave.startDate,
      endDate: leave.endDate,
      leaveType: leave.leaveType,
      reason: leave.reason,
      status: leave.status,
      submittedAt: leave.createdAt,
    }));

    context.data.leaveSummary = {
      returnedRecords: leaves.length,
      pending: leaves.filter((r) => r.status === "Pending").length,
      approved: leaves.filter((r) => r.status === "Approved").length,
      rejected: leaves.filter((r) => r.status === "Rejected").length,
    };
  }

  // Payroll: employees can access their own records only.
  // HR/Admin can access company payroll totals and records.
  if (asksPayroll) {
    const payrollFilter = { company: companyId };

    if (!isStaff) {
      payrollFilter.employee = userId;
    }

    if (
      /\b(this month|current month|this month's|current pay period)\b/.test(
        normalized
      )
    ) {
      payrollFilter.payPeriod = currentMonth;
    }

    const payrollRecords = await Payroll.find(payrollFilter)
      .select(
        "employee payPeriod baseSalary allowances deductions netSalary status paidAt"
      )
      .populate("employee", "name department")
      .sort({ payPeriod: -1 })
      .limit(isStaff ? 200 : 30)
      .lean();

    if (isStaff) {
      context.data.payroll = {
        returnedRecords: payrollRecords.length,
        totalNetSalary: payrollRecords.reduce(
          (sum, record) => sum + record.netSalary,
          0
        ),
        processedRecords: payrollRecords.filter(
          (record) => record.status === "Processed"
        ).length,
        paidRecords: payrollRecords.filter(
          (record) => record.status === "Paid"
        ).length,
        records: payrollRecords.map((record) => ({
          employee: record.employee?.name || "Unknown",
          department: record.employee?.department || "General",
          payPeriod: record.payPeriod,
          baseSalary: record.baseSalary,
          allowances: record.allowances,
          deductions: record.deductions,
          netSalary: record.netSalary,
          status: record.status,
          paidAt: record.paidAt,
        })),
      };
    } else {
      context.data.myPayroll = payrollRecords.map((record) => ({
        payPeriod: record.payPeriod,
        baseSalary: record.baseSalary,
        allowances: record.allowances,
        deductions: record.deductions,
        netSalary: record.netSalary,
        status: record.status,
        paidAt: record.paidAt,
      }));
    }
  }

  if (asksOwnData && !isStaff) {
    const ownUser = await User.findOne({
      _id: userId,
      company: companyId,
      role: "Employee",
      isActive: true,
    }).select("name email department jobTitle joinDate");

    context.data.myProfile = ownUser
      ? {
          name: ownUser.name,
          email: ownUser.email,
          department: ownUser.department,
          jobTitle: ownUser.jobTitle,
          joinDate: ownUser.joinDate,
        }
      : null;
  }

  if (
    !asksEmployees &&
    !asksAttendance &&
    !asksLeaves &&
    !asksPayroll &&
    !asksOwnData
  ) {
    context.data.note =
      "No HR database query was run for this message. Answer general policy questions only from supplied company settings; if a policy is unknown, say so.";
  }

  return context;
}

router.post("/chat", async (req, res) => {
  try {
    const { error, value } = messageSchema.validate(req.body, {
      abortEarly: true,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        message: error.details[0].message,
      });
    }

    if (!ai) {
      return res.status(503).json({
        message: "AI service is not configured.",
      });
    }

    if (!req.user?.companyId || !req.user?.userId) {
      return res.status(401).json({
        message: "A valid company login is required.",
      });
    }

    const allowedRoles = ["Admin", "HR", "Employee"];

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "You are not authorized to use the AI assistant.",
      });
    }

    const context = await getRelevantContext(value.message, req.user);

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `User question:
${value.message}

Authorized HR data retrieved by the server:
${JSON.stringify(context, null, 2)}

Answer rules:
- Answer using the supplied data when the question asks for HR records.
- Never invent counts, records, policies, balances, or salary values.
- Explain which date or pay period the answer covers.
- If the data is absent or incomplete, say so clearly.
- Do not reveal information beyond the user's role and supplied data.
- Never claim that you submitted a request, approved leave, or changed a record.
- You may help draft a leave request, but the user must submit it through the normal form.
- Keep the response clear and concise.`,
            },
          ],
        },
      ],
    });

    const reply = response.text;

    if (!reply) {
      return res.status(502).json({
        message: "The AI service returned an empty response.",
      });
    }

    return res.json({ reply });
  } catch (error) {
    console.error("AI chat error:", error.message);

    return res.status(500).json({
      message: "Unable to process your AI request.",
    });
  }
});

// Example endpoint to check that authentication and AI configuration are present.
// Does not expose secrets or database information.
router.get("/status", (req, res) => {
  return res.json({
    authenticated: true,
    aiConfigured: Boolean(process.env.GEMINI_API_KEY),
    role: req.user.role,
  });
});

export default router;
