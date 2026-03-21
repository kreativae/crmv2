import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { Pipeline } from '../models/Pipeline';
import { Lead } from '../models/Lead';

const router = Router();
router.use(authenticate);
router.use(tenantMiddleware);

// Get all pipelines
router.get('/', async (req, res, next) => {
  try {
    const pipelines = await Pipeline.find({ organizationId: req.organizationId });
    res.json(pipelines);
  } catch (error) {
    next(error);
  }
});

// Get pipeline by ID with leads count per stage
router.get('/:id', async (req, res, next) => {
  try {
    const pipeline = await Pipeline.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    });
    
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline não encontrado' });
    }
    
    // Get leads count per stage
    const leadCounts = await Lead.aggregate([
      { $match: { organizationId: req.organizationId, pipelineId: pipeline._id } },
      { $group: { _id: '$stageId', count: { $sum: 1 } } },
    ]);
    
    const stagesWithCounts = pipeline.stages.map((stage: any) => ({
      ...(stage.toObject ? stage.toObject() : stage),
      leadsCount: leadCounts.find((c: any) => c._id.toString() === (stage._id || stage.id)?.toString())?.count || 0,
    }));
    
    res.json({ ...pipeline.toObject(), stages: stagesWithCounts });
  } catch (error) {
    next(error);
  }
});

// Create pipeline
router.post('/', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const pipeline = new Pipeline({
      ...req.body,
      organizationId: req.organizationId,
    });
    
    await pipeline.save();
    res.status(201).json(pipeline);
  } catch (error) {
    next(error);
  }
});

// Update pipeline
router.put('/:id', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const pipeline = await Pipeline.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline não encontrado' });
    }
    
    res.json(pipeline);
  } catch (error) {
    next(error);
  }
});

// Delete pipeline
router.delete('/:id', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    // Check if pipeline has leads
    const leadsCount = await Lead.countDocuments({
      organizationId: req.organizationId,
      pipelineId: req.params.id,
    });
    
    if (leadsCount > 0) {
      return res.status(400).json({ 
        error: `Não é possível excluir: ${leadsCount} leads neste pipeline` 
      });
    }
    
    const pipeline = await Pipeline.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.organizationId,
    });
    
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline não encontrado' });
    }
    
    res.json({ message: 'Pipeline excluído com sucesso' });
  } catch (error) {
    next(error);
  }
});

// Add stage to pipeline
router.post('/:id/stages', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const pipeline = await Pipeline.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    });
    
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline não encontrado' });
    }
    
    pipeline.stages.push(req.body);
    await pipeline.save();
    
    res.json(pipeline);
  } catch (error) {
    next(error);
  }
});

// Update stage
router.put('/:id/stages/:stageId', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const pipeline = await Pipeline.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    });
    
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline não encontrado' });
    }
    
    const stage = (pipeline.stages as any).id(req.params.stageId);
    if (!stage) {
      return res.status(404).json({ error: 'Etapa não encontrada' });
    }
    
    Object.assign(stage, req.body);
    await pipeline.save();
    
    res.json(pipeline);
  } catch (error) {
    next(error);
  }
});

// Delete stage
router.delete('/:id/stages/:stageId', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    // Check if stage has leads
    const leadsCount = await Lead.countDocuments({
      organizationId: req.organizationId,
      stageId: req.params.stageId,
    });
    
    if (leadsCount > 0) {
      return res.status(400).json({ 
        error: `Não é possível excluir: ${leadsCount} leads nesta etapa` 
      });
    }
    
    const pipeline = await Pipeline.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    });
    
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline não encontrado' });
    }
    
    (pipeline.stages as any).pull({ _id: req.params.stageId });
    await pipeline.save();
    
    res.json(pipeline);
  } catch (error) {
    next(error);
  }
});

// Reorder stages
router.put('/:id/stages/reorder', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { stageIds } = req.body;
    
    const pipeline = await Pipeline.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    });
    
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline não encontrado' });
    }
    
    // Reorder stages based on stageIds array
    const reorderedStages = stageIds.map((id: string, index: number) => {
      const stage = (pipeline.stages as any).id(id);
      if (stage) {
        stage.order = index;
        return stage;
      }
    }).filter(Boolean);
    
    pipeline.stages = reorderedStages;
    await pipeline.save();
    
    res.json(pipeline);
  } catch (error) {
    next(error);
  }
});

export default router;
