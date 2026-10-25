import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import User from "../Models/User.js";
import Attendance from "../Models/Attendance.js";
import LeaveRequest from "../Models/LeaveRequest.js";
import Payroll from "../Models/Payroll.js";

const router = Router();

router.use(authenticate);

router.get("/", async (req, res) => {
  try {
    const { companyId, userId, role } = req.user;

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const currentMonth = today.slice(0, 7);

    // EMPLOYEE DASHBOARD
    if (role === "Employee") {
      const [attendanceCount, pendingLeaves, latestPayroll] =
        await Promise.all([
          Attendance.countDocuments({
            company: companyId,
            employee: userId,
            date: { $regex: `^${currentMonth}` },
          }),

          LeaveRequest.countDocuments({
            company: companyId,
            employee: userId,
            status: "Pending",
          }),

          Payroll.findOne({
            company: companyId,
            employee: userId,
          }).sort({ payPeriod: -1 }),
        ]);

      return res.json({
        role,
        attendance: {
          recordsThisMonth: attendanceCount,
        },
        leave: {
          pendingRequests: pendingLeaves,
        },
        latestPayslip: latestPayroll
          ? {
              id: latestPayroll._id,
              payPeriod: latestPayroll.payPeriod,
              netSalary: latestPayroll.netSalary,
              status: latestPayroll.status,
            }
          : null,
      });
    }

    // ADMIN / HR DASHBOARD
    if (role === "Admin" || role === "HR") {
      const [
        totalEmployees,
        activeEmployees,
        todayAttendance,
        pendingLeaves,
        monthlyPayroll,
        recentLeaves,
      ] = await Promise.all([
        User.countDocuments({
          company: companyId,
          role: "Employee",
        }),

        User.countDocuments({
          company: companyId,
          role: "Employee",
          isActive: true,
        }),

        Attendance.countDocuments({
          company: companyId,
          date: today,
        }),

        LeaveRequest.countDocuments({
          company: companyId,
          status: "Pending",
        }),

        Payroll.aggregate([
          {
            $match: {
              company: new (await import("mongoose")).default.Types.ObjectId(
                companyId
              ),
              payPeriod: currentMonth,
            },
          },
          {
            $group: {
              _id: null,
              totalNetSalary: { $sum: "$netSalary" },
              payrollCount: { $sum: 1 },
              paidCount: {
                $sum: {
                  $cond: [{ $eq: ["$status", "Paid"] }, 1, 0],
                },
              },
            },
          },
        ]),

        LeaveRequest.find({ company: companyId })
          .populate("employee", "name department")
          .sort({ createdAt: -1 })
          .limit(5),
      ]);

      const payrollSummary = monthlyPayroll[0] || {
        totalNetSalary: 0,
        payrollCount: 0,
        paidCount: 0,
      };

      return res.json({
        role,
        employees: {
          total: totalEmployees,
          active: activeEmployees,
          inactive: totalEmployees - activeEmployees,
        },
        attendance: {
          recordsToday: todayAttendance,
        },
        leave: {
          pendingRequests: pendingLeaves,
          recentRequests: recentLeaves,
        },
        payroll: {
          payPeriod: currentMonth,
          totalNetSalary: payrollSummary.totalNetSalary,
          payrollRecords: payrollSummary.payrollCount,
          paidRecords: payrollSummary.paidCount,
        },
      });
    }

    return res.status(403).json({
      message: "Access denied",
    });
  } catch (error) {
    console.error("Dashboard error:", error);

    return res.status(500).json({
      message: "Failed to load dashboard",
    });
  }
});

export default router;