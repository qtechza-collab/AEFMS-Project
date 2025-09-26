// API utility stub - redirects to dataService
import { dataService } from './supabaseDataService';

export const api = {
  // Claims
  getClaims: async (userId?: string) => {
    if (userId) {
      return dataService.getUserExpenseClaims(userId);
    }
    return dataService.getClaims();
  },
  createClaim: async (claim: any) => dataService.createClaim(claim),
  updateClaim: async (id: string, updates: any) => dataService.updateClaim(id, updates),
  
  // Notifications  
  getNotifications: async (userId: string) => dataService.getNotifications(userId),
  markNotificationAsRead: async (id: string) => dataService.markNotificationAsRead(id),
  
  // Analytics
  getClaimAnalytics: async () => dataService.getClaimAnalytics(),
  getAnalyticsSummary: async (userId: string) => {
    try {
      const result = await dataService.getUserExpenseClaims(userId);
      if (result.success && result.data) {
        const claims = result.data;
        const pendingClaims = claims.filter((c: any) => c.status === 'pending').length;
        const approvedClaims = claims.filter((c: any) => c.status === 'approved').length;
        const totalAmount = claims.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
        const approvedAmount = claims
          .filter((c: any) => c.status === 'approved')
          .reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
        
        return {
          success: true,
          data: {
            pendingClaims,
            approvedClaims,
            totalAmount,
            approvedAmount,
            totalClaims: claims.length
          }
        };
      }
      return { success: false, error: 'No data found' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
  
  // File upload
  uploadFile: async (file: File, path: string) => dataService.uploadFile(file, path)
};

export default api;