import { useHiringFunnel, useTimeToHire } from './useAnalytics';
import { useJobs } from './useJobs'; // Assuming this exists to get Job Titles or I get them from funnel?
// Actually funnel data might not have job titles. I should check.
// If funnel data has job_id but not title, I need to fetch jobs to map titles.

interface JobBreakdown {
    jobId: string;
    jobTitle: string;
    applicants: number;
    shortlisted: number;
    interviewing: number;
    offered: number;
    hired: number;
    avgTime: number;
    status: string;
}

interface RecruiterDashboardData {
    kpis: {
        totalApplicants: number;
        shortlisted: number;
        inInterview: number;
        offersSent: number;
        hired: number;
        avgTimeToHire: number;
    };
    funnelSeries: {
        name: string;
        data: number[];
    }[]; // For chart
    funnelCategories: string[];
    jobsBreakdown: JobBreakdown[];
    timeline: any[]; // Placeholder for timeline
    isLoading: boolean;
}

export function useRecruiterAnalytics() {
    const { data: funnelData, isLoading: funnelLoading } = useHiringFunnel();
    const { data: timeData, isLoading: timeLoading } = useTimeToHire();
    const { jobs, isLoading: jobsLoading } = useJobs();

    const isLoading = funnelLoading || timeLoading || jobsLoading;

    if (isLoading || !funnelData || !jobs) {
        return {
            kpis: { totalApplicants: 0, shortlisted: 0, inInterview: 0, offersSent: 0, hired: 0, avgTimeToHire: 0 },
            funnelSeries: [],
            funnelCategories: [],
            jobsBreakdown: [],
            timeline: [],
            isLoading: true
        };
    }

    // --- 1. KPIs ---
    const totalApplicants = funnelData.filter(s => s.stage === 'applied').reduce((acc, s) => acc + s.candidate_count, 0);
    const shortlisted = funnelData.filter(s => ['agency_shortlisted', 'employer_review'].includes(s.stage)).reduce((acc, s) => acc + s.candidate_count, 0);
    const inInterview = funnelData.filter(s => ['technical_approved', 'interview_completed'].includes(s.stage)).reduce((acc, s) => acc + s.candidate_count, 0);
    const offersSent = funnelData.filter(s => s.stage === 'offer_sent').reduce((acc, s) => acc + s.candidate_count, 0);
    const hired = funnelData.filter(s => s.stage === 'offer_accepted').reduce((acc, s) => acc + s.candidate_count, 0);

    // Calculate avg time to hire across all jobs
    const avgTimeToHire = timeData && timeData.length > 0
        ? Math.round(timeData.reduce((acc, d) => acc + d.avg_days_to_hire, 0) / timeData.length)
        : 0;

    // --- 2. Hiring Funnel Chart ---
    const stages = ['applied', 'agency_shortlisted', 'employer_review', 'technical_approved', 'interview_completed', 'offer_sent', 'offer_accepted'];
    const stageLabels = ['Applied', 'Shortlisted', 'Review', 'Tech Approved', 'Interview', 'Offer', 'Hired'];

    const funnelCounts = stages.map(stage => {
        return funnelData.filter(s => s.stage === stage).reduce((acc, s) => acc + s.candidate_count, 0);
    });

    const funnelSeries = [{
        name: 'Candidates',
        data: funnelCounts
    }];

    // --- 3. Job Breakdown ---
    // Map job IDs to titles
    const jobMap = new Map(jobs.map(j => [j.id, { title: j.title, status: j.status }]));

    // Group funnel by job
    const jobStats = new Map<string, JobBreakdown>();

    funnelData.forEach(item => {
        if (!jobStats.has(item.job_id)) {
            const jobInfo = jobMap.get(item.job_id);
            jobStats.set(item.job_id, {
                jobId: item.job_id,
                jobTitle: jobInfo?.title || 'Unknown Job',
                status: jobInfo?.status || 'closed',
                applicants: 0,
                shortlisted: 0,
                interviewing: 0,
                offered: 0,
                hired: 0,
                avgTime: 0
            });
        }

        const stat = jobStats.get(item.job_id)!;
        if (item.stage === 'applied') stat.applicants += item.candidate_count;
        if (['agency_shortlisted', 'employer_review'].includes(item.stage)) stat.shortlisted += item.candidate_count;
        if (['technical_approved', 'interview_completed'].includes(item.stage)) stat.interviewing += item.candidate_count;
        if (item.stage === 'offer_sent') stat.offered += item.candidate_count;
        if (item.stage === 'offer_accepted') stat.hired += item.candidate_count;
    });

    // Add time to hire
    timeData?.forEach(t => {
        if (jobStats.has(t.job_id)) {
            jobStats.get(t.job_id)!.avgTime = t.avg_days_to_hire;
        }
    });

    const jobsBreakdown = Array.from(jobStats.values());

    return {
        kpis: {
            totalApplicants,
            shortlisted,
            inInterview,
            offersSent,
            hired,
            avgTimeToHire
        },
        funnelSeries,
        funnelCategories: stageLabels,
        jobsBreakdown,
        timeline: [], // Implement if needed
        isLoading: false
    };
}
