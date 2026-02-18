import express from 'express';
import multer from 'multer';
import { protect, authorize } from '../middleware/auth.js';
import { generateExportData, toCSV, toXLSX } from '../services/missingPlayersExport.js';
import { importMissingPlayers, parseUploadedFile } from '../services/missingPlayersImport.js';

const router = express.Router();

// Configure multer for file uploads (memory storage for parsing)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'text/csv',
      'application/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.endsWith('.csv') || file.originalname.endsWith('.xlsx')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and XLSX files are allowed'));
    }
  },
});

// @desc    Detect missing ranked players and return summary
// @route   GET /api/missing-players/detect
// @access  Private (admin, staff)
router.get('/detect', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { rows, summary } = await generateExportData();
    res.status(200).json({
      success: true,
      summary,
      // Only return actionable + ambiguous rows (not OK) for the UI
      candidates: rows.filter(r => r.status !== 'OK'),
    });
  } catch (error) {
    console.error('Detection error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Export missing players as CSV
// @route   GET /api/missing-players/export/csv
// @access  Private (admin, staff)
router.get('/export/csv', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { rows, summary } = await generateExportData();
    const csvContent = toCSV(rows);

    const filename = `ZTA_Missing_Players_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send(csvContent);
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Export missing players as XLSX
// @route   GET /api/missing-players/export/xlsx
// @access  Private (admin, staff)
router.get('/export/xlsx', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { rows, summary } = await generateExportData();
    const buffer = toXLSX(rows);

    const filename = `ZTA_Missing_Players_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('XLSX export error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Import reviewed missing players file
// @route   POST /api/missing-players/import
// @access  Private (admin)
router.post('/import', protect, authorize('admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const dryRun = req.query.dryRun === 'true';
    const mimetype = req.file.mimetype || (req.file.originalname.endsWith('.csv') ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    const rows = await parseUploadedFile(req.file.buffer, mimetype);

    if (!rows || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'File contains no data rows' });
    }

    const report = await importMissingPlayers(rows, {
      userId: req.user._id.toString(),
      filename: req.file.originalname,
      dryRun,
    });

    const statusCode = report.failed > 0 && report.created === 0 && report.updated === 0 ? 400 : 200;

    res.status(statusCode).json({
      success: report.failed === 0 || report.created > 0 || report.updated > 0,
      report,
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
