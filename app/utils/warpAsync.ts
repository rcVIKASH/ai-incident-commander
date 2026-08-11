import { NextFunction, Request, Response } from "express";

const wrapAsync = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) => {
  return function (req: Request, res: Response, next: NextFunction) {
    fn(req, res, next).catch(next); //pass any errors to the next middleware (error handler)
  };
};

export default wrapAsync;
