import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

export const keywordGroupsRouter = Router();

keywordGroupsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const groups = await prisma.keywordGroup.findMany({
      include: {
        keywords: {
          orderBy: { weight: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: groups.map((group) => ({
        id: group.id,
        name: group.name,
        isActive: group.isActive,
        weight: group.weight,
        keywords: group.keywords.map((kw) => ({
          id: kw.id,
          word: kw.word,
          weight: kw.weight,
        })),
        createdAt: group.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('[KeywordGroups] List failed:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '获取关键词组失败' },
    });
  }
});

keywordGroupsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { name, weight = 1.0, keywords = [] } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '关键词组名称不能为空' },
      });
    }

    if (!Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '至少需要1个关键词' },
      });
    }

    if (keywords.length > 20) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '最多支持20个关键词' },
      });
    }

    let defaultUser = await prisma.user.findFirst();
    if (!defaultUser) {
      defaultUser = await prisma.user.create({
        data: {
          username: 'default_user',
        },
      });
    }

    const group = await prisma.keywordGroup.create({
      data: {
        name: name.trim(),
        weight: Math.max(0.1, Math.min(10.0, weight)),
        userId: defaultUser.id,
        keywords: {
          create: keywords
            .filter(
              (kw: any) =>
                kw.word && typeof kw.word === 'string' && kw.word.trim().length > 0
            )
            .map((kw: any) => ({
              word: kw.word.trim(),
              weight: Math.max(0.1, Math.min(10.0, kw.weight || 1.0)),
            })),
        },
      },
      include: {
        keywords: true,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: group.id,
        name: group.name,
        isActive: group.isActive,
        weight: group.weight,
        keywords: group.keywords.map((kw) => ({
          id: kw.id,
          word: kw.word,
          weight: kw.weight,
        })),
        createdAt: group.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[KeywordGroups] Create failed:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: { code: 'DUPLICATE_ERROR', message: '该名称已存在' },
      });
    }
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '创建关键词组失败' },
    });
  }
});

keywordGroupsRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, isActive, weight, keywords } = req.body;

    const existingGroup = await prisma.keywordGroup.findUnique({
      where: { id },
    });

    if (!existingGroup) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '关键词组不存在' },
      });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (isActive !== undefined) updateData.isActive = isActive;
    if (weight !== undefined) updateData.weight = Math.max(0.1, Math.min(10.0, weight));

    if (keywords !== undefined) {
      await prisma.keyword.deleteMany({ where: { groupId: id as string } });
      updateData.keywords = {
        create: keywords
          .filter(
            (kw: any) =>
              kw.word && typeof kw.word === 'string' && kw.word.trim().length > 0
          )
          .map((kw: any) => ({
            word: kw.word.trim(),
            weight: Math.max(0.1, Math.min(10.0, kw.weight || 1.0)),
          })),
      };
    }

    const updatedGroup = await prisma.keywordGroup.update({
      where: { id },
      data: updateData,
      include: { keywords: true },
    }) as any;

    res.json({
      success: true,
      data: {
        id: updatedGroup.id,
        name: updatedGroup.name,
        isActive: updatedGroup.isActive,
        weight: updatedGroup.weight,
        keywords: updatedGroup.keywords.map((kw: any) => ({
          id: kw.id,
          word: kw.word,
          weight: kw.weight,
        })),
        createdAt: updatedGroup.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[KeywordGroups] Update failed:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: { code: 'DUPLICATE_ERROR', message: '该名称已存在' },
      });
    }
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '更新关键词组失败' },
    });
  }
});

keywordGroupsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const existingGroup = await prisma.keywordGroup.findUnique({
      where: { id },
    });

    if (!existingGroup) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '关键词组不存在' },
      });
    }

    await prisma.keywordGroup.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[KeywordGroups] Delete failed:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '删除关键词组失败' },
    });
  }
});
