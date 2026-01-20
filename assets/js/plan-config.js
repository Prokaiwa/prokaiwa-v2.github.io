// /assets/js/plan-config.js

export const PLAN_FEATURES = {
    'line': {
        name: 'LINE Practice Plan',
        code: 'A',  // Legacy code for reference
        hasLine: true,
        hasVideo: false,
        hasLessons: false,
        monthlyCredits: 0,
        dashboardAccessAfterCancel: 'immediate'  // Access ends immediately
    },
    'video': {
        name: '1-on-1 Video Lessons',
        code: 'B',
        hasLine: false,
        hasVideo: true,
        hasLessons: true,
        monthlyCredits: 1,  // 1 x 50-min lesson
        dashboardAccessAfterCancel: 'extended'  // +4 months
    },
    'power_lite': {
        name: 'Power Pack Lite',
        code: 'C1',
        hasLine: true,
        hasVideo: true,
        hasLessons: true,
        monthlyCredits: 1,  // Check if this is correct
        dashboardAccessAfterCancel: 'extended'  // +4 months
    },
    'power_pro': {
        name: 'Power Pack Pro',
        code: 'C2',
        hasLine: true,
        hasVideo: true,
        hasLessons: true,
        monthlyCredits: 2,  // Check if this is correct
        dashboardAccessAfterCancel: 'extended'  // +4 months
    }
}

// Helper functions
export function hasVideoAccess(planCode) {
    return PLAN_FEATURES[planCode]?.hasVideo || false
}

export function hasLineAccess(planCode) {
    return PLAN_FEATURES[planCode]?.hasLine || false
}

export function getPlanName(planCode) {
    return PLAN_FEATURES[planCode]?.name || 'Unknown Plan'
}

export function getMonthlyCredits(planCode) {
    return PLAN_FEATURES[planCode]?.monthlyCredits || 0
}
