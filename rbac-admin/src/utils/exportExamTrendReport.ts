import ExcelJS from 'exceljs';

import type { ExamTrendReport } from '../services/exam';

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

function toExcelColumnName(index: number): string {
  let current = index;
  let result = '';
  while (current > 0) {
    const remainder = (current - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / 26);
  }
  return result;
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

export async function exportExamTrendReportToExcel(report: ExamTrendReport): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '八维智能阅卷平台';
  workbook.created = new Date();

  const overviewSheet = workbook.addWorksheet('预警总览');
  overviewSheet.views = [{ state: 'frozen', ySplit: 3 }];
  overviewSheet.autoFilter = 'A3:D3';
  overviewSheet.columns = [
    { width: 20 }, { width: 18 }, { width: 20 }, { width: 18 },
  ];
  overviewSheet.mergeCells('A1:D1');
  const titleCell = overviewSheet.getCell('A1');
  titleCell.value = `考试趋势与预警 - ${report.cycleName}`;
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = TITLE_FILL;
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  overviewSheet.addRow([]);
  styleHeader(overviewSheet.addRow(['指标', '值', '指标', '值']));
  [
    ['周期', report.cycleName, '监控班级', report.classSummaries.length],
    ['重点学生', report.riskStudents.length, '预警阈值', `${report.threshold} 分`],
    ['覆盖考试日', report.examDates.length, '学生数', report.students.length],
  ].forEach((item) => {
    const row = overviewSheet.addRow(item);
    styleDataRow(row);
    row.eachCell((cell) => {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
  });

  const riskSheet = workbook.addWorksheet('重点学生预警');
  riskSheet.views = [{ state: 'frozen', ySplit: 1 }];
  riskSheet.autoFilter = 'A1:G1';
  riskSheet.columns = [
    { width: 16 }, { width: 24 }, { width: 10 }, { width: 14 }, { width: 10 }, { width: 10 }, { width: 48 },
  ];
  styleHeader(riskSheet.addRow(['学生', '班级', '风险等级', '连续低分天数', '最新分数', '平均分', '原因分析']));
  report.riskStudents.forEach((item) => {
    const row = riskSheet.addRow([
      item.studentName,
      item.className,
      item.riskLevel,
      item.consecutiveLowDays,
      item.latestScore ?? '-',
      item.averageScore,
      item.reasonSummary.join('；'),
    ]);
    styleDataRow(row, riskFill(item.riskLevel));
    row.getCell(3).font = { bold: true };
    row.getCell(4).font = { bold: true };
  });

  const classSheet = workbook.addWorksheet('班级趋势');
  classSheet.views = [{ state: 'frozen', ySplit: 1 }];
  const classDateColumns = report.examDates.map((date) => ({ header: date, key: date, width: 12 }));
  classSheet.columns = [
    { header: '班级', key: 'className', width: 22 },
    { header: '学生数', key: 'studentCount', width: 10 },
    { header: '预警人数', key: 'flaggedStudentCount', width: 10 },
    { header: '班级均分', key: 'averageScore', width: 10 },
    ...classDateColumns,
  ];
  styleHeader(classSheet.addRow(classSheet.columns.map((item) => item.header as string)));
  classSheet.autoFilter = `A1:${toExcelColumnName(classSheet.columns.length)}1`;
  report.classSummaries.forEach((item) => {
    const dateMap = new Map(item.dateAverages.map((point) => [point.examDate, point.averageScore]));
    const row = classSheet.addRow([
      item.className,
      item.studentCount,
      item.flaggedStudentCount,
      item.averageScore,
      ...report.examDates.map((date) => dateMap.get(date) ?? '-'),
    ]);
    styleDataRow(row, item.flaggedStudentCount > 0 ? MEDIUM_FILL : undefined);
  });

  const studentSheet = workbook.addWorksheet('学生每日趋势');
  studentSheet.views = [{ state: 'frozen', ySplit: 1 }];
  studentSheet.columns = [
    { header: '学生', key: 'studentName', width: 16 },
    { header: '班级', key: 'className', width: 24 },
    { header: '平均分', key: 'averageScore', width: 10 },
    { header: '最新分数', key: 'latestScore', width: 10 },
    { header: '风险等级', key: 'riskLevel', width: 10 },
    { header: '连续低分', key: 'consecutiveLowDays', width: 12 },
    { header: '原因分析', key: 'reasonSummary', width: 36 },
    ...report.examDates.map((date) => ({ header: date, key: date, width: 12 })),
  ];
  styleHeader(studentSheet.addRow(studentSheet.columns.map((item) => item.header as string)));
  studentSheet.autoFilter = `A1:${toExcelColumnName(studentSheet.columns.length)}1`;
  report.students.forEach((item) => {
    const pointMap = new Map(item.points.map((point) => [point.examDate, point.score]));
    const row = studentSheet.addRow([
      item.studentName,
      item.className,
      item.averageScore,
      item.latestScore ?? '-',
      item.riskLevel,
      item.consecutiveLowDays,
      item.reasonSummary.join('；'),
      ...report.examDates.map((date) => pointMap.get(date) ?? '-'),
    ]);
    styleDataRow(row, riskFill(item.riskLevel));
    row.getCell(5).font = { bold: true };
  });

  const focusSheet = workbook.addWorksheet('连续低分明细');
  focusSheet.views = [{ state: 'frozen', ySplit: 1 }];
  focusSheet.autoFilter = 'A1:H1';
  focusSheet.columns = [
    { width: 16 }, { width: 24 }, { width: 10 }, { width: 14 }, { width: 10 }, { width: 10 }, { width: 36 }, { width: 24 },
  ];
  styleHeader(focusSheet.addRow(['学生', '班级', '风险等级', '连续低分天数', '最新分数', '平均分', '原因分析', '最近成绩序列']));
  if (report.riskStudents.length === 0) {
    styleDataRow(focusSheet.addRow(['暂无预警学生', '-', '-', '-', '-', '-', '-', '-']));
  } else {
    report.riskStudents.forEach((item) => {
      const trend = report.students.find((student) => student.studentKey === item.studentKey);
      const recentScores = trend?.points.slice(-5).map((point) => `${point.examDate}:${point.score ?? '-'}`).join('；') ?? '-';
      const row = focusSheet.addRow([
        item.studentName,
        item.className,
        item.riskLevel,
        item.consecutiveLowDays,
        item.latestScore ?? '-',
        item.averageScore,
        item.reasonSummary.join('；'),
        recentScores,
      ]);
      styleDataRow(row, HIGH_FILL);
      row.getCell(3).font = { bold: true, color: { argb: 'FFCF1322' } };
      row.getCell(4).font = { bold: true, color: { argb: 'FFCF1322' } };
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  saveWorkbook(buffer, `考试趋势预警_${report.cycleName}.xlsx`);
}
