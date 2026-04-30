import ExcelJS from 'exceljs';

import type { HomeworkReport } from '../services/homework';

const BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
  left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
  bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
  right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
};

const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF2F7' } };
const TITLE_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F1F1F' } };
const HIGH_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE7E8' } };
const MEDIUM_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7E6' } };
const LOW_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F7F7' } };
const HIGHLIGHT_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF6FFED' } };

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = HEADER_FILL;
    cell.border = BORDER;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
}

function styleDataRow(row: ExcelJS.Row, fill?: ExcelJS.Fill) {
  row.eachCell((cell) => {
    cell.border = BORDER;
    cell.alignment = { vertical: 'middle', wrapText: true };
    if (fill) {
      cell.fill = fill;
    }
  });
}

function severityFill(severity: string): ExcelJS.Fill | undefined {
  switch (severity) {
    case 'high':
      return HIGH_FILL;
    case 'medium':
      return MEDIUM_FILL;
    case 'low':
      return LOW_FILL;
    default:
      return undefined;
  }
}

function riskFill(level: string): ExcelJS.Fill | undefined {
  switch (level) {
    case 'high':
      return HIGH_FILL;
    case 'medium':
      return MEDIUM_FILL;
    case 'low':
      return LOW_FILL;
    default:
      return undefined;
  }
}

function saveWorkbook(buffer: ExcelJS.Buffer, filename: string) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportHomeworkReportToExcel(report: HomeworkReport): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '八维作业审批平台';
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet('汇报总览');
  summarySheet.views = [{ state: 'frozen', ySplit: 3 }];
  summarySheet.autoFilter = 'A3:D3';
  summarySheet.columns = [
    { width: 24 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
  ];
  summarySheet.mergeCells('A1:D1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = `作业审批汇报 - ${report.checkDate}`;
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = TITLE_FILL;
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  summarySheet.addRow([]);
  styleHeader(summarySheet.addRow(['指标', '值', '指标', '值']));
  [
    ['覆盖班级', report.overview.classCount, '应交人数', report.overview.totalStudents],
    ['已交人数', report.overview.submittedCount, '未交人数', report.overview.missingCount],
    ['已审批人数', report.overview.reviewedCount, '平均分', report.overview.averageScore],
    ['严重问题', report.overview.severityStats.high, '一般问题', report.overview.severityStats.medium],
    ['个别问题', report.overview.severityStats.low, '重点学生', report.keyStudents.length],
  ].forEach((item) => {
    const row = summarySheet.addRow(item);
    styleDataRow(row);
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
  });

  summarySheet.addRow([]);
  styleHeader(summarySheet.addRow(['高频共性问题', '分类', '严重度', '出现次数']));
  if (report.overview.commonIssues.length === 0) {
    const row = summarySheet.addRow(['暂无', '-', '-', '-']);
    styleDataRow(row);
  } else {
    report.overview.commonIssues.forEach((item) => {
      const row = summarySheet.addRow([item.label, item.category, item.severity, item.count]);
      styleDataRow(row, severityFill(item.severity));
    });
  }

  summarySheet.addRow([]);
  styleHeader(summarySheet.addRow(['薄弱知识点', '未掌握', '部分掌握', '已掌握']));
  if (report.overview.knowledgeWeaknesses.length === 0) {
    const row = summarySheet.addRow(['暂无', 0, 0, 0]);
    styleDataRow(row);
  } else {
    report.overview.knowledgeWeaknesses.forEach((item) => {
      const row = summarySheet.addRow([item.name, item.weakCount, item.partialCount, item.masteredCount]);
      styleDataRow(row, item.weakCount > 0 ? MEDIUM_FILL : undefined);
    });
  }

  const classSheet = workbook.addWorksheet('班级汇总');
  classSheet.views = [{ state: 'frozen', ySplit: 1 }];
  classSheet.autoFilter = 'A1:N1';
  classSheet.columns = [
    { width: 20 }, { width: 20 }, { width: 14 }, { width: 30 }, { width: 10 }, { width: 10 },
    { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 38 }, { width: 38 },
  ];
  styleHeader(classSheet.addRow([
    '学院', '专业', '班级', '完整路径', '应交', '已交', '未交', '已审批', '平均分',
    '严重', '一般', '个别', '共性问题', '薄弱知识点',
  ]));
  report.classes.forEach((item) => {
    const row = classSheet.addRow([
      item.collegeName,
      item.majorName,
      item.className,
      item.classPath,
      item.totalStudents,
      item.submittedCount,
      item.missingCount,
      item.reviewedCount,
      item.averageScore,
      item.severityStats.high,
      item.severityStats.medium,
      item.severityStats.low,
      item.commonIssues.map((issue) => `${issue.label} x${issue.count}`).join('；'),
      item.knowledgeWeaknesses.map((point) => `${point.name}(${point.weakCount})`).join('；'),
    ]);
    styleDataRow(row, item.missingCount > 0 || item.severityStats.high > 0 ? MEDIUM_FILL : undefined);
  });

  const studentSheet = workbook.addWorksheet('重点学生');
  studentSheet.views = [{ state: 'frozen', ySplit: 1 }];
  studentSheet.autoFilter = 'A1:I1';
  studentSheet.columns = [
    { width: 16 }, { width: 24 }, { width: 12 }, { width: 10 }, { width: 10 },
    { width: 10 }, { width: 10 }, { width: 40 }, { width: 40 },
  ];
  styleHeader(studentSheet.addRow([
    '学生', '班级', '风险等级', '风险分', '问题数',
    '严重问题', '薄弱知识点', '主要问题', '掌握薄弱点',
  ]));
  report.keyStudents.forEach((item) => {
    const row = studentSheet.addRow([
      item.studentName,
      item.className,
      item.riskLevel,
      item.riskScore,
      item.problemCount,
      item.highIssueCount,
      item.weakKnowledgeCount,
      item.mainProblems.join('；'),
      item.weakKnowledgePoints.join('；'),
    ]);
    styleDataRow(row, riskFill(item.riskLevel));
    row.getCell(3).font = { bold: true };
    row.getCell(4).font = { bold: true };
  });

  const severeSheet = workbook.addWorksheet('严重问题清单');
  severeSheet.views = [{ state: 'frozen', ySplit: 1 }];
  severeSheet.autoFilter = 'A1:E1';
  severeSheet.columns = [
    { width: 24 }, { width: 30 }, { width: 18 }, { width: 12 }, { width: 10 },
  ];
  styleHeader(severeSheet.addRow(['班级', '问题项', '问题分类', '严重度', '出现次数']));
  const severeIssues = report.classes.flatMap((item) =>
    item.commonIssues
      .filter((issue) => issue.severity === 'high')
      .map((issue) => ({
        className: item.className,
        label: issue.label,
        category: issue.category,
        severity: issue.severity,
        count: issue.count,
      })),
  );
  if (severeIssues.length === 0) {
    styleDataRow(severeSheet.addRow(['暂无严重问题', '-', '-', '-', '-']));
  } else {
    severeIssues.forEach((item) => {
      const row = severeSheet.addRow([item.className, item.label, item.category, item.severity, item.count]);
      styleDataRow(row, HIGH_FILL);
      row.getCell(4).font = { bold: true, color: { argb: 'FFCF1322' } };
    });
  }

  const weakSheet = workbook.addWorksheet('薄弱知识点清单');
  weakSheet.views = [{ state: 'frozen', ySplit: 1 }];
  weakSheet.autoFilter = 'A1:D1';
  weakSheet.columns = [
    { width: 24 }, { width: 12 }, { width: 12 }, { width: 12 },
  ];
  styleHeader(weakSheet.addRow(['知识点', '未掌握', '部分掌握', '已掌握']));
  if (report.overview.knowledgeWeaknesses.length === 0) {
    styleDataRow(weakSheet.addRow(['暂无', 0, 0, 0]));
  } else {
    report.overview.knowledgeWeaknesses.forEach((item) => {
      const row = weakSheet.addRow([item.name, item.weakCount, item.partialCount, item.masteredCount]);
      styleDataRow(row, item.weakCount > 0 ? HIGHLIGHT_FILL : undefined);
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  saveWorkbook(buffer, `作业审批汇报_${report.checkDate}.xlsx`);
}
