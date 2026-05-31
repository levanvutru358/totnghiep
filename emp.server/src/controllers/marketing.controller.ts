import { Request, Response } from 'express';
import { marketingService } from '../services/marketing.service';
import { sendError, sendSuccess } from '../utils/api-response';

const getBody = (req: Request): Record<string, unknown> =>
  typeof req.body === 'object' && req.body !== null ? (req.body as Record<string, unknown>) : {};

const mapError = (
  error: unknown,
): { status: number; message: string; errorCode?: string } => {
  const message = error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR';
  const errorCode = message.split(':')[0];

  if (
    errorCode === 'BANNER_NOT_FOUND' ||
    errorCode === 'FLASH_SALE_NOT_FOUND' ||
    errorCode === 'SECTION_NOT_FOUND' ||
    errorCode === 'SECTION_PRODUCT_NOT_FOUND'
  ) {
    return { status: 404, message: 'Không tìm thấy', errorCode };
  }
  if (errorCode === 'PRODUCT_NOT_FOUND') {
    return { status: 404, message: 'Sản phẩm không tồn tại hoặc đã ngưng bán', errorCode };
  }
  if (errorCode === 'FLASH_SALE_PRODUCT_EXISTS' || errorCode === 'SECTION_PRODUCT_EXISTS') {
    return { status: 409, message: 'Sản phẩm đã có trong mục này', errorCode };
  }
  if (
    errorCode === 'MISSING_TITLE' ||
    errorCode === 'MISSING_IMAGE_URL' ||
    errorCode === 'INVALID_PLACEMENT' ||
    errorCode === 'INVALID_PRODUCT_ID' ||
    errorCode === 'INVALID_SECTION' ||
    errorCode === 'INVALID_DATE'
  ) {
    return { status: 400, message: 'Dữ liệu không hợp lệ', errorCode };
  }

  return { status: 500, message: 'Internal server error', errorCode: 'INTERNAL_SERVER_ERROR' };
};

export const marketingController = {
  async listBanners(req: Request, res: Response) {
    try {
      const data = await marketingService.listBanners(req.query as Record<string, unknown>);
      return sendSuccess(res, 200, 'Marketing banners fetched', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async createBanner(req: Request, res: Response) {
    try {
      const data = await marketingService.createBanner(getBody(req));
      return sendSuccess(res, 201, 'Banner created', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async updateBanner(req: Request, res: Response) {
    try {
      const data = await marketingService.updateBanner(Number(req.params.bannerId), getBody(req));
      return sendSuccess(res, 200, 'Banner updated', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async removeBanner(req: Request, res: Response) {
    try {
      const data = await marketingService.removeBanner(Number(req.params.bannerId));
      return sendSuccess(res, 200, 'Banner removed', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async listHomeSections(_req: Request, res: Response) {
    try {
      const data = await marketingService.listHomeSections();
      return sendSuccess(res, 200, 'Home sections fetched', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async updateHomeSection(req: Request, res: Response) {
    try {
      const code = marketingService.parseSectionCode(req.params.sectionCode);
      const data = await marketingService.updateHomeSection(code, getBody(req));
      return sendSuccess(res, 200, 'Home section updated', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async listSectionProducts(req: Request, res: Response) {
    try {
      const section = marketingService.parseSectionCode(req.params.sectionCode ?? 'FLASH_SALE');
      const data = await marketingService.listSectionProducts(section, req.query as Record<string, unknown>);
      return sendSuccess(res, 200, 'Section products fetched', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async createSectionProduct(req: Request, res: Response) {
    try {
      const section = marketingService.parseSectionCode(req.params.sectionCode ?? 'FLASH_SALE');
      const data = await marketingService.createSectionProduct(section, getBody(req));
      return sendSuccess(res, 201, 'Section product created', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async updateSectionProduct(req: Request, res: Response) {
    try {
      const data = await marketingService.updateSectionProduct(Number(req.params.itemId), getBody(req));
      return sendSuccess(res, 200, 'Section product updated', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async removeSectionProduct(req: Request, res: Response) {
    try {
      const data = await marketingService.removeSectionProduct(Number(req.params.itemId));
      return sendSuccess(res, 200, 'Section product removed', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  /** @deprecated use listSectionProducts with FLASH_SALE */
  async listFlashSale(req: Request, res: Response) {
    req.params.sectionCode = 'FLASH_SALE';
    return marketingController.listSectionProducts(req, res);
  },

  async createFlashSale(req: Request, res: Response) {
    req.params.sectionCode = 'FLASH_SALE';
    return marketingController.createSectionProduct(req, res);
  },

  async updateFlashSale(req: Request, res: Response) {
    return marketingController.updateSectionProduct(req, res);
  },

  async removeFlashSale(req: Request, res: Response) {
    return marketingController.removeSectionProduct(req, res);
  },

  async getPublicHome(_req: Request, res: Response) {
    try {
      const data = await marketingService.getPublicHome();
      return sendSuccess(res, 200, 'Marketing home content fetched', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },
};
