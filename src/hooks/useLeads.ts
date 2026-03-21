import { logger } from '../utils/logger';
import { useCallback } from 'react';
import { leadService, type LeadFilters } from '../api/services/leadService';
import { useStore } from '../store';
import type { Lead } from '../types';

export function useLeads() {
  const { leads, addLead, updateLead, deleteLead, moveLeadToStage } = useStore();

  const fetchLeads = useCallback(async (filters?: LeadFilters) => {
    try {
      const response = await leadService.getAll(filters);
      // Update store with fetched leads
      return response.data;
    } catch (error) {
      logger.log('API not available, using store data');
      return leads;
    }
  }, [leads]);

  const createLead = useCallback(async (lead: Partial<Lead>) => {
    const newLead: Lead = {
      _id: `lead_${Date.now()}`,
      organizationId: 'org_1',
      name: lead.name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      company: lead.company,
      source: lead.source || 'website',
      tags: lead.tags || [],
      pipelineId: lead.pipelineId || 'pip_1',
      stageId: lead.stageId || 'stage_1',
      assignedTo: lead.assignedTo || '',
      status: lead.status || 'new',
      score: lead.score || 50,
      value: lead.value || 0,
      notes: lead.notes || '',
      createdAt: new Date().toISOString(),
    };

    try {
      const created = await leadService.create(lead);
      addLead(created);
      return created;
    } catch (error) {
      // Fallback to local store
      addLead(newLead);
      return newLead;
    }
  }, [addLead]);

  const editLead = useCallback(async (id: string, updates: Partial<Lead>) => {
    try {
      const updated = await leadService.update(id, updates);
      updateLead(id, updated);
      return updated;
    } catch (error) {
      // Fallback to local store
      updateLead(id, updates);
      return { ...leads.find(l => l._id === id), ...updates } as Lead;
    }
  }, [updateLead, leads]);

  const removeLead = useCallback(async (id: string) => {
    try {
      await leadService.delete(id);
      deleteLead(id);
    } catch (error) {
      // Fallback to local store
      deleteLead(id);
    }
  }, [deleteLead]);

  const bulkDeleteLeads = useCallback(async (ids: string[]) => {
    try {
      await leadService.bulkDelete(ids);
      ids.forEach(id => deleteLead(id));
    } catch (error) {
      // Fallback to local store
      ids.forEach(id => deleteLead(id));
    }
  }, [deleteLead]);

  const bulkUpdateLeads = useCallback(async (ids: string[], updates: Partial<Lead>) => {
    try {
      await leadService.bulkUpdate(ids, updates);
      ids.forEach(id => updateLead(id, updates));
    } catch (error) {
      // Fallback to local store
      ids.forEach(id => updateLead(id, updates));
    }
  }, [updateLead]);

  const moveToStage = useCallback(async (id: string, stageId: string) => {
    try {
      await leadService.moveToStage(id, stageId);
      moveLeadToStage(id, stageId);
    } catch (error) {
      // Fallback to local store
      moveLeadToStage(id, stageId);
    }
  }, [moveLeadToStage]);

  const updateScore = useCallback(async (id: string, score: number) => {
    try {
      await leadService.updateScore(id, score);
      updateLead(id, { score });
    } catch (error) {
      // Fallback to local store
      updateLead(id, { score });
    }
  }, [updateLead]);

  return {
    leads,
    fetchLeads,
    createLead,
    editLead,
    removeLead,
    bulkDeleteLeads,
    bulkUpdateLeads,
    moveToStage,
    updateScore,
  };
}

export default useLeads;
