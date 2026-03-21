import { TestSeries } from '../../models/App/testSeriesSchema.js';
import { TestSubmission } from '../../models/App/testSubmissionSchema.js';
import { Student } from '../../models/student/studentSchema.js';
import { StudentAttendance } from '../../models/student/studentAttendanceSchema.js';

const sanitizeTestForStudent = (test) => {
  return {
    _id: test._id,
    title: test.title,
    description: test.description,
    subject: test.subject,
    className: test.className,
    durationMinutes: test.durationMinutes,
    isActive: test.isActive,
    questions: test.questions.map((q, idx) => ({
      questionIndex: idx,
      questionText: q.questionText,
      options: q.options,
      marks: q.marks
    }))
  };
};

const listStudentTests = async (req, res) => {
  try {
    const { q = '', page = 1, limit = 20 } = req.query;
    const filter = { isActive: true };

    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { subject: { $regex: q, $options: 'i' } },
        { className: { $regex: q, $options: 'i' } }
      ];
    }

    const parsedPage = Math.max(Number(page) || 1, 1);
    const parsedLimit = Math.max(Number(limit) || 20, 1);

    const [tests, total] = await Promise.all([
      TestSeries.find(filter, {
        title: 1,
        description: 1,
        subject: 1,
        className: 1,
        durationMinutes: 1,
        isActive: 1,
        createdAt: 1,
        questions: 1
      })
        .sort({ createdAt: -1 })
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit),
      TestSeries.countDocuments(filter)
    ]);

    const data = tests.map((item) => ({
      _id: item._id,
      title: item.title,
      description: item.description,
      subject: item.subject,
      className: item.className,
      durationMinutes: item.durationMinutes,
      totalQuestions: item.questions.length,
      totalMarks: item.questions.reduce((sum, qItem) => sum + Number(qItem.marks || 1), 0)
    }));

    return res.json({
      success: true,
      data,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const getStudentTestById = async (req, res) => {
  try {
    const { testId } = req.params;
    const test = await TestSeries.findById(testId);

    if (!test || !test.isActive) {
      return res.json({ success: false, message: 'Test not found' });
    }

    return res.json({ success: true, data: sanitizeTestForStudent(test) });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const submitStudentTest = async (req, res) => {
  try {
    const { testId } = req.params;
    const { answers = [] } = req.body;

    const test = await TestSeries.findById(testId);
    if (!test || !test.isActive) {
      return res.json({ success: false, message: 'Test not found' });
    }

    const answerMap = new Map();
    for (const ans of answers) {
      answerMap.set(Number(ans.questionIndex), Number(ans.selectedOption));
    }

    let score = 0;
    let totalMarks = 0;

    test.questions.forEach((q, idx) => {
      const marks = Number(q.marks || 1);
      totalMarks += marks;
      if (answerMap.get(idx) === Number(q.correctOption)) {
        score += marks;
      }
    });

    const saved = await TestSubmission.findOneAndUpdate(
      { testId: test._id, studentId: req.studentId },
      {
        testId: test._id,
        studentId: req.studentId,
        answers: answers.map((a) => ({
          questionIndex: Number(a.questionIndex),
          selectedOption: Number(a.selectedOption)
        })),
        score,
        totalMarks,
        submittedAt: new Date()
      },
      { upsert: true, new: true }
    );

    return res.json({
      success: true,
      message: 'Test submitted successfully',
      data: {
        submissionId: saved._id,
        score,
        totalMarks
      }
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const getStudentAnswers = async (req, res) => {
  try {
    const { testId } = req.params;

    const [test, submission] = await Promise.all([
      TestSeries.findById(testId),
      TestSubmission.findOne({ testId, studentId: req.studentId })
    ]);

    if (!test) {
      return res.json({ success: false, message: 'Test not found' });
    }

    if (!submission) {
      return res.json({ success: false, message: 'No submission found for this test' });
    }

    const studentAnswerMap = new Map();
    submission.answers.forEach((a) => {
      studentAnswerMap.set(Number(a.questionIndex), Number(a.selectedOption));
    });

    const answerSheet = test.questions.map((q, idx) => ({
      questionIndex: idx,
      questionText: q.questionText,
      options: q.options,
      correctOption: Number(q.correctOption),
      selectedOption: studentAnswerMap.has(idx) ? studentAnswerMap.get(idx) : null,
      explanation: q.explanation || '',
      marks: Number(q.marks || 1)
    }));

    return res.json({
      success: true,
      data: {
        score: submission.score,
        totalMarks: submission.totalMarks,
        answers: answerSheet
      }
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const getTestLeaderboard = async (req, res) => {
  try {
    const { testId } = req.params;

    const submissions = await TestSubmission.find({ testId })
      .populate('studentId', 'name registrationNumber')
      .sort({ score: -1, submittedAt: 1 })
      .limit(100);

    const data = submissions.map((item, index) => ({
      rank: index + 1,
      studentName: item.studentId?.name || 'Unknown',
      registrationNumber: item.studentId?.registrationNumber || '-',
      score: item.score,
      totalMarks: item.totalMarks,
      submittedAt: item.submittedAt
    }));

    return res.json({ success: true, data });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const getStudentAttendance = async (req, res) => {
  try {
    const attendance = await StudentAttendance.find({ studentId: req.studentId }).sort({ date: -1 });
    return res.json({ success: true, data: attendance });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

export {
  listStudentTests,
  getStudentTestById,
  submitStudentTest,
  getStudentAnswers,
  getTestLeaderboard,
  getStudentAttendance
};
