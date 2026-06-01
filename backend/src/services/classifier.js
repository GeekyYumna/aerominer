'use strict';

const CLASSIFIERS = [
  { category: 'flight-simulation', pattern: /flight.sim|flightsim|simulator|msfs|x-plane|flightgear|fsx/i },
  { category: 'drone-firmware',    pattern: /drone|uav|autopilot|px4|ardupilot|quadcopter|betaflight/i    },
  { category: 'aerodynamics',      pattern: /aerodynam|cfd|computational.fluid|airfoil|lift|drag/i        },
  { category: 'navigation',        pattern: /navigation|gnss|gps|inertial|ins|kalman|waypoint/i           },
  { category: 'avionics',          pattern: /atc|air.traffic|avionics|transponder|adsb|ads-b|tcas/i       },
];

function classify(repo) {
  const text = [
    repo.name,
    repo.description || '',
    (repo.topics || []).join(' '),
  ].join(' ');

  for (const { category, pattern } of CLASSIFIERS) {
    if (pattern.test(text)) return category;
  }
  return 'Unknown';
}

function transform(repo) {
  return {
    github_id:   repo.id,
    full_name:   repo.full_name,
    description: repo.description ? repo.description.slice(0, 500) : null,
    category:    classify(repo),
    language:    repo.language    || null,
    stars:       repo.stargazers_count,
    forks:       repo.forks_count,
    topics:      JSON.stringify(repo.topics || []),
    github_url:  repo.html_url,
  };
}

module.exports = { classify, transform };