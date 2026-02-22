import { BadRequestException } from '@nestjs/common';

const ALLOWED_IMAGE_MIMES = /^image\/(jpeg|png|gif|webp)$/;
const ALLOWED_VIDEO_MIMES = /^video\/(mp4|webm|quicktime)$/;

export function imageFileFilter(
  _req: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
): void {
  if (!ALLOWED_IMAGE_MIMES.test(file.mimetype)) {
    return callback(
      new BadRequestException(
        `Invalid file type: ${file.mimetype}. Allowed: jpeg, png, gif, webp`,
      ),
      false,
    );
  }
  callback(null, true);
}

export function mediaFileFilter(
  _req: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
): void {
  if (!ALLOWED_IMAGE_MIMES.test(file.mimetype) && !ALLOWED_VIDEO_MIMES.test(file.mimetype)) {
    return callback(
      new BadRequestException(
        `Invalid file type: ${file.mimetype}. Allowed: jpeg, png, gif, webp, mp4, webm, quicktime`,
      ),
      false,
    );
  }
  callback(null, true);
}
