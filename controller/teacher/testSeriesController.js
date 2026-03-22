import { TestSeries } from '../../models/App/testSeriesSchema.js';

const addTestSeries = async (req, res) => {
  try {
    const { title, description, subject, className, durationMinutes, questions, isActive } = req.body;

    if (!title || !Array.isArray(questions) || !questions.length) {
      return res.json({ success: false, message: 'Title and questions are required' });
    }

    const normalizedQuestions = questions.map((q) => ({
      questionText: q.questionText,
      options: q.options,
      correctOption: Number(q.correctOption),
      explanation: q.explanation || '',
      marks: Number(q.marks || 1)
    }));

    const test = await TestSeries.create({
      title,
      description,
      subject,
      className,
      durationMinutes,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      questions: normalizedQuestions,
      createdByRole: 'teacher',
      createdById: req.teacher?.userId || null
    });

    return res.json({ success: true, message: 'Test series added successfully', data: test });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const getAllTestSeriesForTeacher = async (req, res) => {
  try {
    const data = await TestSeries.find({}).sort({ createdAt: -1 });
    return res.json({ success: true, data, message: 'All test series found' });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

export { addTestSeries, getAllTestSeriesForTeacher };
