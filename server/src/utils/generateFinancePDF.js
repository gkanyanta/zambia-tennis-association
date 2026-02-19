import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// A4 portrait dimensions
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

const COLORS = {
  primary: '#1F2937',
  secondary: '#6B7280',
  accent: '#2563EB',
  border: '#D1D5DB',
  lightBg: '#F3F4F6',
  headerBg: '#1E3A5F',
  headerText: '#FFFFFF',
  green: '#059669',
  red: '#DC2626',
  incomeTag: '#059669',
  expenseTag: '#DC2626',
};

const INCOME_CATEGORIES = {
  entry_fees: 'Entry Fees',
  sponsorship: 'Sponsorship',
  food_sales: 'Food Sales',
  merchandise: 'Merchandise',
  other_income: 'Other Income',
};

const EXPENSE_CATEGORIES = {
  venue: 'Venue',
  balls: 'Balls',
  trophies: 'Trophies',
  umpires: 'Umpires',
  transport: 'Transport',
  meals: 'Meals',
  accommodation: 'Accommodation',
  printing: 'Printing',
  medical: 'Medical',
  equipment: 'Equipment',
  marketing: 'Marketing',
  administration: 'Administration',
  other_expense: 'Other Expense',
};

const PAYMENT_METHODS = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  mobile_money: 'Mobile Money',
  cheque: 'Cheque',
  other: 'Other',
};

function categoryLabel(value) {
  return INCOME_CATEGORIES[value] || EXPENSE_CATEGORIES[value] || value.replace(/_/g, ' ');
}

function formatCurrency(amount) {
  return `K${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateRange(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  const opts = { day: 'numeric', month: 'short', year: 'numeric' };
  if (s.toDateString() === e.toDateString()) {
    return s.toLocaleDateString('en-GB', opts);
  }
  return `${s.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${e.toLocaleDateString('en-GB', opts)}`;
}

/**
 * Render standard page header with tournament info
 */
function renderPageHeader(doc, tournament, title) {
  const logoPath = path.join(__dirname, '../assets/zta-logo.png');

  // Header background
  doc.save();
  doc.rect(MARGIN, MARGIN, CONTENT_WIDTH, 55).fill(COLORS.headerBg);
  doc.restore();

  // Logo
  try {
    doc.image(logoPath, MARGIN + 8, MARGIN + 8, { height: 40 });
  } catch (e) {
    // Logo not available
  }

  // Tournament name
  doc.save();
  doc
    .fontSize(14)
    .fillColor(COLORS.headerText)
    .font('Helvetica-Bold')
    .text(tournament.name, MARGIN, MARGIN + 6, {
      width: CONTENT_WIDTH,
      align: 'center',
      lineBreak: false,
    });
  doc.restore();

  // Title
  doc.save();
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor(COLORS.headerText)
    .text(title, MARGIN, MARGIN + 24, {
      width: CONTENT_WIDTH,
      align: 'center',
      lineBreak: false,
    });
  doc.restore();

  // Venue, dates
  const dateStr = formatDateRange(tournament.startDate, tournament.endDate);
  const venue = [tournament.venue, tournament.city].filter(Boolean).join(', ');
  doc.save();
  doc
    .fontSize(7)
    .fillColor(COLORS.headerText)
    .text(`${venue}  |  ${dateStr}  |  Zambia Tennis Association`, MARGIN, MARGIN + 40, {
      width: CONTENT_WIDTH,
      align: 'center',
      lineBreak: false,
    });
  doc.restore();

  return MARGIN + 65;
}

/**
 * Render page footer
 */
function renderFooter(doc) {
  doc.save();
  doc
    .fontSize(7)
    .fillColor(COLORS.secondary)
    .font('Helvetica')
    .text(
      `Generated on ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} — Zambia Tennis Association`,
      MARGIN,
      PAGE_HEIGHT - MARGIN - 15,
      { width: CONTENT_WIDTH, align: 'center' }
    );
  doc.restore();
}

/**
 * Draw a table header row (used for initial render and page-break re-render)
 */
function drawTableHeader(doc, columns, y, tableWidth, headerBg, headerTextColor, headerFontSize, headerRowHeight) {
  doc.save();
  doc.rect(MARGIN, y, tableWidth, headerRowHeight).fill(headerBg);
  doc.fontSize(headerFontSize).font('Helvetica-Bold').fillColor(headerTextColor);

  let colX = MARGIN;
  for (const col of columns) {
    doc.text(col.label, colX + 4, y + 6, {
      width: col.width - 8,
      align: col.align || 'left',
      lineBreak: false,
    });
    colX += col.width;
  }
  doc.restore();
}

/**
 * Render a table. Returns the Y position after the table.
 * columns: [{ label, width, align?, key? }]
 * rows: [[val0, val1, ...]] — values accessed by column index
 * options: { headerBg, rowHeight, fontSize, totalRow?, colorFn? }
 */
function renderTable(doc, columns, rows, startY, options = {}) {
  const {
    headerBg = COLORS.headerBg,
    headerTextColor = COLORS.headerText,
    rowHeight = 22,
    fontSize = 8,
    headerFontSize = 8,
    totalRow = null,
    colorFn = null,
  } = options;

  let y = startY;
  const tableWidth = columns.reduce((s, c) => s + c.width, 0);
  const headerRowHeight = rowHeight + 2;
  const textPadY = Math.round((rowHeight - fontSize) / 2);

  // Header row
  drawTableHeader(doc, columns, y, tableWidth, headerBg, headerTextColor, headerFontSize, headerRowHeight);
  y += headerRowHeight;

  // Data rows
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Check if we need a new page
    if (y + rowHeight > PAGE_HEIGHT - MARGIN - 20) {
      doc.addPage({ size: 'A4', margin: MARGIN });
      y = MARGIN + 10;
      drawTableHeader(doc, columns, y, tableWidth, headerBg, headerTextColor, headerFontSize, headerRowHeight);
      y += headerRowHeight;
    }

    // Row background (alternating)
    if (i % 2 === 0) {
      doc.save();
      doc.rect(MARGIN, y, tableWidth, rowHeight).fill(COLORS.lightBg);
      doc.restore();
    }

    // Row bottom border
    doc.save();
    doc.moveTo(MARGIN, y + rowHeight)
      .lineTo(MARGIN + tableWidth, y + rowHeight)
      .lineWidth(0.3)
      .strokeColor(COLORS.border)
      .stroke();
    doc.restore();

    // Row data
    let colX = MARGIN;
    for (let j = 0; j < columns.length; j++) {
      const col = columns[j];
      const val = row[j] !== undefined ? row[j] : (col.key ? row[col.key] : '');
      const textVal = String(val ?? '-');

      // Determine text color
      let textColor = COLORS.primary;
      if (colorFn) {
        const color = colorFn(row, j, col);
        if (color) textColor = color;
      }

      doc.save();
      doc.font('Helvetica').fontSize(fontSize).fillColor(textColor);
      doc.text(textVal, colX + 4, y + textPadY, {
        width: col.width - 8,
        align: col.align || 'left',
        lineBreak: false,
      });
      doc.restore();

      colX += col.width;
    }
    y += rowHeight;
  }

  // Total row
  if (totalRow) {
    if (y + headerRowHeight > PAGE_HEIGHT - MARGIN - 20) {
      doc.addPage({ size: 'A4', margin: MARGIN });
      y = MARGIN + 10;
    }

    doc.save();
    doc.rect(MARGIN, y, tableWidth, headerRowHeight).fill(COLORS.headerBg);
    doc.fontSize(fontSize).font('Helvetica-Bold').fillColor(COLORS.headerText);
    let colX = MARGIN;
    for (let j = 0; j < columns.length; j++) {
      const col = columns[j];
      const val = totalRow[j] !== undefined ? totalRow[j] : '';
      doc.text(String(val), colX + 4, y + 6, {
        width: col.width - 8,
        align: col.align || 'left',
        lineBreak: false,
      });
      colX += col.width;
    }
    doc.restore();
    y += headerRowHeight;
  }

  return y;
}

/**
 * Render a summary box with key-value pairs
 */
function renderSummaryBox(doc, items, startY, title) {
  let y = startY;

  // Check if we need a new page
  const boxPadding = 14;
  const lineHeight = 26;
  const titleSpace = title ? 24 : 0;
  const boxHeight = boxPadding * 2 + items.length * lineHeight;
  const totalNeeded = titleSpace + boxHeight;

  if (y + totalNeeded > PAGE_HEIGHT - MARGIN - 20) {
    doc.addPage({ size: 'A4', margin: MARGIN });
    y = MARGIN + 10;
  }

  if (title) {
    doc.save();
    doc.fontSize(12).font('Helvetica-Bold').fillColor(COLORS.primary).text(title, MARGIN, y);
    doc.restore();
    y += titleSpace;
  }

  const boxWidth = CONTENT_WIDTH;

  // Box border
  doc.save();
  doc.rect(MARGIN, y, boxWidth, boxHeight).lineWidth(1).strokeColor(COLORS.border).stroke();
  doc.restore();

  let itemY = y + boxPadding;
  for (const item of items) {
    // Label
    doc.save();
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor(COLORS.secondary)
      .text(item.label, MARGIN + boxPadding, itemY + 3, { width: boxWidth / 2 - boxPadding, lineBreak: false });
    doc.restore();

    // Value
    const valueColor = item.color || COLORS.primary;
    doc.save();
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor(valueColor)
      .text(item.value, MARGIN + boxWidth / 2, itemY + 3, {
        width: boxWidth / 2 - boxPadding,
        align: 'right',
        lineBreak: false,
      });
    doc.restore();

    // Divider line (except last)
    if (item !== items[items.length - 1]) {
      doc.save();
      doc
        .moveTo(MARGIN + boxPadding, itemY + lineHeight - 2)
        .lineTo(MARGIN + boxWidth - boxPadding, itemY + lineHeight - 2)
        .lineWidth(0.3)
        .strokeColor(COLORS.border)
        .stroke();
      doc.restore();
    }

    itemY += lineHeight;
  }

  return y + boxHeight;
}

// =============================================
// BUDGET PDF
// =============================================

/**
 * Generate a PDF of the tournament budget
 * @param {Object} tournament
 * @param {Object} financeData - { budget, summary, ... }
 * @returns {Promise<Buffer>}
 */
export const generateBudgetPDF = (tournament, financeData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: MARGIN });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      let y = renderPageHeader(doc, tournament, 'Tournament Budget');
      y += 10;

      const budget = financeData.budget || [];

      if (budget.length === 0) {
        doc.fontSize(12).fillColor(COLORS.secondary).text('No budget lines recorded.', MARGIN, y);
        doc.end();
        return;
      }

      // Separate income and expense lines
      const incomeLines = budget.filter((b) => b.type === 'income');
      const expenseLines = budget.filter((b) => b.type === 'expense');

      // Table columns: Type | Category | Description | Amount | Notes
      const columns = [
        { label: 'Type', width: 60, align: 'left' },
        { label: 'Category', width: 90, align: 'left' },
        { label: 'Description', width: 130, align: 'left' },
        { label: 'Amount', width: 80, align: 'right' },
        { label: 'Notes', width: CONTENT_WIDTH - 360, align: 'left' },
      ];

      // Build rows — income first, then expense
      const allLines = [...incomeLines, ...expenseLines];
      const rows = allLines.map((line) => [
        line.type === 'income' ? 'Income' : 'Expense',
        categoryLabel(line.category),
        line.description || '-',
        formatCurrency(line.budgetedAmount),
        (line.notes || '-').substring(0, 60) + ((line.notes || '').length > 60 ? '...' : ''),
      ]);

      // Subtotals
      const incomeTotal = incomeLines.reduce((s, b) => s + b.budgetedAmount, 0);
      const expenseTotal = expenseLines.reduce((s, b) => s + b.budgetedAmount, 0);

      y = renderTable(doc, columns, rows, y);
      y += 5;

      // Summary section
      y = renderSummaryBox(doc, [
        { label: 'Total Budgeted Income', value: formatCurrency(incomeTotal), color: COLORS.green },
        { label: 'Total Budgeted Expenses', value: formatCurrency(expenseTotal), color: COLORS.red },
        {
          label: 'Projected Profit/Loss',
          value: formatCurrency(incomeTotal - expenseTotal),
          color: incomeTotal - expenseTotal >= 0 ? COLORS.green : COLORS.red,
        },
      ], y + 10, 'Budget Summary');

      renderFooter(doc);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// =============================================
// FINANCE REPORT PDF
// =============================================

/**
 * Generate a comprehensive finance report PDF
 * @param {Object} tournament
 * @param {Object} financeData - full finance data from getTournamentFinanceSummary
 * @returns {Promise<Buffer>}
 */
export const generateFinanceReportPDF = (tournament, financeData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: MARGIN });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const { summary, entryFeeIncome, budget, expenses, manualIncome } = financeData;

      // ========== PAGE 1: SUMMARY ==========
      let y = renderPageHeader(doc, tournament, 'Financial Report');
      y += 15;

      y = renderSummaryBox(doc, [
        { label: 'Budgeted Income', value: formatCurrency(summary.budgetedIncome) },
        { label: 'Actual Income', value: formatCurrency(summary.actualIncome), color: COLORS.green },
        { label: 'Budgeted Expenses', value: formatCurrency(summary.budgetedExpenses) },
        { label: 'Actual Expenses', value: formatCurrency(summary.actualExpenses), color: COLORS.red },
        {
          label: 'Projected Profit/Loss',
          value: formatCurrency(summary.projectedProfit),
          color: summary.projectedProfit >= 0 ? COLORS.green : COLORS.red,
        },
        {
          label: 'Actual Profit/Loss',
          value: formatCurrency(summary.actualProfit),
          color: summary.actualProfit >= 0 ? COLORS.green : COLORS.red,
        },
      ], y, 'Financial Summary');

      // ========== PAGE 2: ENTRY FEE INCOME ==========
      doc.addPage({ size: 'A4', margin: MARGIN });
      y = renderPageHeader(doc, tournament, 'Entry Fee Income');
      y += 10;

      const entryColumns = [
        { label: 'Category', width: 160, align: 'left' },
        { label: 'Paid', width: 60, align: 'center' },
        { label: 'Waived', width: 60, align: 'center' },
        { label: 'Unpaid', width: 60, align: 'center' },
        { label: 'Paid Amount', width: CONTENT_WIDTH - 340, align: 'right' },
      ];

      const entryRows = (entryFeeIncome.byCategory || []).map((cat) => [
        cat.categoryName,
        String(cat.paid.count),
        String(cat.waived.count),
        String(cat.unpaid.count),
        formatCurrency(cat.paid.amount),
      ]);

      const entryTotalRow = [
        'Total',
        String((entryFeeIncome.byCategory || []).reduce((s, c) => s + c.paid.count, 0)),
        String((entryFeeIncome.byCategory || []).reduce((s, c) => s + c.waived.count, 0)),
        String((entryFeeIncome.byCategory || []).reduce((s, c) => s + c.unpaid.count, 0)),
        formatCurrency(entryFeeIncome.totals.paid),
      ];

      if (entryRows.length > 0) {
        y = renderTable(doc, entryColumns, entryRows, y, { totalRow: entryTotalRow });
      } else {
        doc.fontSize(10).fillColor(COLORS.secondary).text('No entries recorded.', MARGIN, y);
      }

      // ========== PAGE 3: OTHER INCOME ==========
      doc.addPage({ size: 'A4', margin: MARGIN });
      y = renderPageHeader(doc, tournament, 'Other Income');
      y += 10;

      const incomeColumns = [
        { label: 'Date', width: 70, align: 'left' },
        { label: 'Category', width: 80, align: 'left' },
        { label: 'Description', width: 100, align: 'left' },
        { label: 'Amount', width: 70, align: 'right' },
        { label: 'From', width: 75, align: 'left' },
        { label: 'Method', width: 60, align: 'left' },
        { label: 'Receipt', width: CONTENT_WIDTH - 455, align: 'left' },
      ];

      const incomeRecords = manualIncome || [];
      const incomeRows = incomeRecords.map((item) => [
        formatDate(item.date),
        categoryLabel(item.category),
        (item.description || '-').substring(0, 20),
        formatCurrency(item.amount),
        (item.receivedFrom || '-').substring(0, 15),
        PAYMENT_METHODS[item.paymentMethod] || '-',
        (item.receiptReference || '-').substring(0, 12),
      ]);

      const incomeTotalAmount = incomeRecords.reduce((s, i) => s + i.amount, 0);
      const incomeTotalRow = ['Total', '', '', formatCurrency(incomeTotalAmount), '', '', ''];

      if (incomeRows.length > 0) {
        y = renderTable(doc, incomeColumns, incomeRows, y, { totalRow: incomeTotalRow });
      } else {
        doc.fontSize(10).fillColor(COLORS.secondary).text('No other income recorded.', MARGIN, y);
      }

      // ========== PAGE 4: EXPENSES ==========
      doc.addPage({ size: 'A4', margin: MARGIN });
      y = renderPageHeader(doc, tournament, 'Expenses');
      y += 10;

      const expenseColumns = [
        { label: 'Date', width: 70, align: 'left' },
        { label: 'Category', width: 80, align: 'left' },
        { label: 'Description', width: 100, align: 'left' },
        { label: 'Amount', width: 70, align: 'right' },
        { label: 'Paid To', width: 75, align: 'left' },
        { label: 'Method', width: 60, align: 'left' },
        { label: 'Receipt', width: CONTENT_WIDTH - 455, align: 'left' },
      ];

      const expenseRecords = expenses || [];
      const expenseRows = expenseRecords.map((exp) => [
        formatDate(exp.date),
        categoryLabel(exp.category),
        (exp.description || '-').substring(0, 20),
        formatCurrency(exp.amount),
        (exp.paidTo || '-').substring(0, 15),
        PAYMENT_METHODS[exp.paymentMethod] || '-',
        (exp.receiptReference || '-').substring(0, 12),
      ]);

      const expenseTotalAmount = expenseRecords.reduce((s, e) => s + e.amount, 0);
      const expenseTotalRow = ['Total', '', '', formatCurrency(expenseTotalAmount), '', '', ''];

      if (expenseRows.length > 0) {
        y = renderTable(doc, expenseColumns, expenseRows, y, { totalRow: expenseTotalRow });
      } else {
        doc.fontSize(10).fillColor(COLORS.secondary).text('No expenses recorded.', MARGIN, y);
      }

      // ========== PAGE 5: BUDGET VS ACTUALS ==========
      doc.addPage({ size: 'A4', margin: MARGIN });
      y = renderPageHeader(doc, tournament, 'Budget vs Actuals');
      y += 10;

      // Build budget-vs-actuals rows
      const bvaRows = [];
      const seen = new Set();

      // From budget lines
      for (const line of (budget || [])) {
        if (!seen.has(line.category)) {
          seen.add(line.category);
          const budgeted = (budget || [])
            .filter((b) => b.category === line.category)
            .reduce((s, b) => s + b.budgetedAmount, 0);

          let actual = 0;
          if (line.type === 'expense') {
            actual = (expenses || []).filter((e) => e.category === line.category).reduce((s, e) => s + e.amount, 0);
          } else {
            if (line.category === 'entry_fees') {
              actual = entryFeeIncome.totals.paid;
            } else {
              actual = (manualIncome || []).filter((i) => i.category === line.category).reduce((s, i) => s + i.amount, 0);
            }
          }

          const variance = line.type === 'income' ? actual - budgeted : budgeted - actual;
          bvaRows.push({ type: line.type, category: line.category, budgeted, actual, variance });
        }
      }

      // Expense categories with actuals but no budget
      for (const exp of (expenses || [])) {
        if (!seen.has(exp.category)) {
          seen.add(exp.category);
          const actual = (expenses || []).filter((e) => e.category === exp.category).reduce((s, e) => s + e.amount, 0);
          bvaRows.push({ type: 'expense', category: exp.category, budgeted: 0, actual, variance: -actual });
        }
      }

      // Income categories with actuals but no budget
      for (const inc of (manualIncome || [])) {
        if (!seen.has(inc.category)) {
          seen.add(inc.category);
          const actual = (manualIncome || []).filter((i) => i.category === inc.category).reduce((s, i) => s + i.amount, 0);
          bvaRows.push({ type: 'income', category: inc.category, budgeted: 0, actual, variance: actual });
        }
      }

      // Sort: income first
      bvaRows.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'income' ? -1 : 1;
        return a.category.localeCompare(b.category);
      });

      const bvaColumns = [
        { label: 'Type', width: 70, align: 'left' },
        { label: 'Category', width: 120, align: 'left' },
        { label: 'Budgeted', width: 100, align: 'right' },
        { label: 'Actual', width: 100, align: 'right' },
        { label: 'Variance', width: CONTENT_WIDTH - 390, align: 'right' },
      ];

      const bvaTableRows = bvaRows.map((row) => [
        row.type === 'income' ? 'Income' : 'Expense',
        categoryLabel(row.category),
        formatCurrency(row.budgeted),
        formatCurrency(row.actual),
        (row.variance >= 0 ? '+' : '') + formatCurrency(row.variance),
      ]);

      if (bvaTableRows.length > 0) {
        y = renderTable(doc, bvaColumns, bvaTableRows, y, {
          colorFn: (row, colIdx) => {
            if (colIdx === 4) {
              // Variance column — check if positive or negative
              const val = row[4];
              if (val && val.startsWith('+')) return COLORS.green;
              if (val && val.startsWith('-')) return COLORS.red;
            }
            return null;
          },
        });
      } else {
        doc.fontSize(10).fillColor(COLORS.secondary).text('No budget or transaction data available.', MARGIN, y);
      }

      // Variance summary at the bottom
      y += 15;

      const totalBudgetedIncome = bvaRows.filter((r) => r.type === 'income').reduce((s, r) => s + r.budgeted, 0);
      const totalActualIncome = bvaRows.filter((r) => r.type === 'income').reduce((s, r) => s + r.actual, 0);
      const totalBudgetedExpense = bvaRows.filter((r) => r.type === 'expense').reduce((s, r) => s + r.budgeted, 0);
      const totalActualExpense = bvaRows.filter((r) => r.type === 'expense').reduce((s, r) => s + r.actual, 0);

      const incomeVariance = totalActualIncome - totalBudgetedIncome;
      const expenseVariance = totalBudgetedExpense - totalActualExpense;
      const netProfitVariance = incomeVariance + expenseVariance;

      y = renderSummaryBox(doc, [
        {
          label: 'Total Income Variance',
          value: (incomeVariance >= 0 ? '+' : '') + formatCurrency(incomeVariance),
          color: incomeVariance >= 0 ? COLORS.green : COLORS.red,
        },
        {
          label: 'Total Expense Variance',
          value: (expenseVariance >= 0 ? '+' : '') + formatCurrency(expenseVariance),
          color: expenseVariance >= 0 ? COLORS.green : COLORS.red,
        },
        {
          label: 'Net Profit Variance',
          value: (netProfitVariance >= 0 ? '+' : '') + formatCurrency(netProfitVariance),
          color: netProfitVariance >= 0 ? COLORS.green : COLORS.red,
        },
      ], y, 'Variance Summary');

      renderFooter(doc);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
