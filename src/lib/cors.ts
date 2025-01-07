import Cors from 'cors';
import { NextApiRequest, NextApiResponse } from 'next';

const cors = Cors({
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  origin: '*',
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
function runMiddleware(req: NextApiRequest, res: NextApiResponse, fn: Function) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: unknown) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function corsHandler(req: NextApiRequest, res: NextApiResponse) {
  await runMiddleware(req, res, cors);
}
