import { Response, NextFunction } from 'express';
import { AuthRequest, AppError } from '../../types';
import * as service from './reports.service';
import { sendSuccess } from '../../utils/response';

const parseDateRange = (from: unknown, to: unknown): { from: Date; to: Date } => {
  if (!from || !to) throw new AppError(400, 'from and to query params are required (ISO date strings)');
  const fromDate = new Date(from as string);
  const toDate = new Date(to as string);
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    throw new AppError(400, 'Invalid date format. Use ISO 8601 (e.g. 2026-04-01)');
  }
  // Set to end of day for `to`
  toDate.setHours(23, 59, 59, 999);
  return { from: fromDate, to: toDate };
};

export const gstReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { from, to } = parseDateRange(req.query['from'], req.query['to']);
    const data = await service.getGstReport(from, to);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const exportCsv = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { from, to } = parseDateRange(req.query['from'], req.query['to']);
    const csv = await service.exportGstReportCsv(from, to);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="gst-report-${from.toISOString().slice(0, 10)}-to-${to.toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (err) { next(err); }
};
