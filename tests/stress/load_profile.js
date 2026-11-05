import http from 'k6/http';
import { check, sleep } from 'k6';

const stress = __ENV.TEST_PROFILE === 'stress';
export const options = stress ? {
    stages: [
        { duration: '1m', target: 2000 },  
        { duration: '3m', target: 10000 }, 
        { duration: '1m', target: 0 },     
    ],
    thresholds: {
        checks: ['rate==1'],
        http_req_duration: ['p(95)<200', 'p(99)<500'], 
        http_req_failed: ['rate<0.0001'],
    },
} : { vus: 1, iterations: 10, thresholds: { checks: ['rate==1'], http_req_failed: ['rate==0'] } };

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:8080';

export default function () {
    const payload = JSON.stringify({
        base_payload: {
            birth_date: '1989-11-23',
            birth_time: '04:30:00',
            latitude: 22.572645,
            longitude: 88.363892,
            timezone_offset: 5.5
        },
        milestones: [
            { type: 'CAREER_PROMOTION', approxDate: '2018-07-15', confidence: 'HIGH' },
            { type: 'HEALTH_PHYSICAL', approxDate: '2022-03-22', confidence: 'HIGH' }
        ],
        search_window_minutes: 15
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'X-User-ID': `STRESS_USER_${__VU}_${__ITER}`
        },
    };

    // Execute High-Precision Birth Time Calibration Step
    const btrResponse = http.post(`${BASE_URL}/api/v1/btr/rectify`, payload, { ...params, responseCallback: http.expectedStatuses(503) });
    check(btrResponse, {
        'Unavailable BTR does not fabricate a candidate': (r) => r.status === 503 && r.json().error === 'DASHA_CALCULATION_UNAVAILABLE',
        'Unavailable BTR returns no fit or time': (r) => r.json().candidate_fit_score === null && r.json().candidate_birth_time === null,
        'BTR returns the current API contract': (r) => r.json().is_certified === false && r.json().independent_validation_status === 'NOT_PERFORMED',
    });

    sleep(0.5); 

    // Run Multi-Dimensional Conflict Logic Resolution Matrix
    const resolverResponse = http.get(`${BASE_URL}/api/v1/resolver/evaluate?user_id=USR_KOLKATA_89&category=Wealth`, { ...params, responseCallback: http.expectedStatuses(503) });
    check(resolverResponse, {
        'Unavailable profile graph fails closed': (r) => r.status === 503 && r.json().error === 'PROFILE_GRAPH_UNAVAILABLE',
        'Unavailable graph never fabricates vectors': (r) => r.json().vector_matrix === null && r.json().is_graph_verified === false,
    });

    sleep(0.5);
}
