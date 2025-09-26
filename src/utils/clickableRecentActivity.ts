import { recentActivityService, type ActivityItem } from './recentActivity';

export interface ClickableActivityItem extends ActivityItem {
  clickable: boolean;
  navigationUrl?: string;
  actionType?: 'view' | 'edit' | 'approve' | 'download';
}

/**
 * Logan Freights Clickable Recent Activity Service
 */
class ClickableRecentActivityService {
  
  async getClickableActivity(limit: number = 10): Promise<{ success: boolean; activities?: ClickableActivityItem[]; error?: string }> {
    try {
      const result = await recentActivityService.getRecentActivity(limit);
      
      if (!result.success || !result.activities) {
        return result;
      }

      const clickableActivities: ClickableActivityItem[] = result.activities.map(activity => ({
        ...activity,
        clickable: this.isActivityClickable(activity),
        navigationUrl: this.getNavigationUrl(activity),
        actionType: this.getActionType(activity)
      }));

      return { success: true, activities: clickableActivities };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get clickable activity'
      };
    }
  }

  private isActivityClickable(activity: ActivityItem): boolean {
    // Determine if the activity can be clicked for navigation
    switch (activity.type) {
      case 'claim_submitted':
      case 'claim_approved':
      case 'claim_rejected':
        return !!activity.metadata?.claimId;
      case 'receipt_uploaded':
        return !!activity.metadata?.receiptId;
      case 'user_registered':
        return !!activity.userId;
      default:
        return false;
    }
  }

  private getNavigationUrl(activity: ActivityItem): string | undefined {
    switch (activity.type) {
      case 'claim_submitted':
      case 'claim_approved':
      case 'claim_rejected':
        return activity.metadata?.claimId ? `/claims/${activity.metadata.claimId}` : undefined;
      case 'receipt_uploaded':
        return activity.metadata?.receiptId ? `/receipts/${activity.metadata.receiptId}` : undefined;
      case 'user_registered':
        return `/users/${activity.userId}`;
      default:
        return undefined;
    }
  }

  private getActionType(activity: ActivityItem): 'view' | 'edit' | 'approve' | 'download' | undefined {
    switch (activity.type) {
      case 'claim_submitted':
        return 'approve';
      case 'claim_approved':
      case 'claim_rejected':
        return 'view';
      case 'receipt_uploaded':
        return 'download';
      case 'user_registered':
        return 'view';
      default:
        return 'view';
    }
  }

  async handleActivityClick(activity: ClickableActivityItem): Promise<{ success: boolean; action?: string; error?: string }> {
    try {
      if (!activity.clickable || !activity.navigationUrl) {
        return {
          success: false,
          error: 'Activity is not clickable'
        };
      }

      // Log the click interaction
      await recentActivityService.logActivity(
        'activity_click',
        `Clicked on ${activity.title}`,
        activity.userId,
        { originalActivityId: activity.id, clickedUrl: activity.navigationUrl }
      );

      return {
        success: true,
        action: 'navigate',
        navigationUrl: activity.navigationUrl
      } as any;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to handle activity click'
      };
    }
  }
}

export const clickableRecentActivityService = new ClickableRecentActivityService();