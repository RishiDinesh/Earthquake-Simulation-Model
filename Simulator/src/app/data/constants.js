// Earthquake Stats
export const epicenterCoordinates = [77.2223, 28.5934];
export const generateEarthquake = () => {
  const magnitude = 6 + Math.random(); // * 4
  return [magnitude.toFixed(1), Math.floor(magnitude - 6)];
};
export const faultRegionRadius = [10, 20, 30, 40];

// Population Stats
export const populationInFaultRegion = [20, 40, 60, 80];
export const populationSurrounding = 40;
export const populationMinimumInitialHealth = [30, 20, 10, 0];
export const populationHealthDropBeforeFirstAid = 1 / 20; // per minute
export const populationHealthDropBeforeMedicalCamp = 1 / 30; // per minute
export const populationEnergyDropBeforeFoodCamp = 1 / 40;

// Infrastructure Stats
export const housesInFaultRegion = [5, 10, 15, 20];
export const housesSurrounding = 10;
export const houseMinimumInitialDamage = [70, 80, 85, 90];

// Evacuation
export const evacuationCenters = [2, 3, 4, 5];
export const evacuationCenterBufferTime = 15; // minutes

// SOS
export const SOSMaxCallDuration = 2; // minutes
export const SOSCallDuration = { min: 1, max: 5 }; // minutes

// First Aid Camps
export const FirstAidMaxDuration = 10; // minutes
export const FirstAidHealthIncrease = 1; // per minute

// Medical Camps
export const getMedicalPriority = (age, gender, health) =>
  4.97661178376 * Math.exp(Math.pow(age - 50, 2)) -
  Math.exp((age * gender) / 100) +
  age / 50 +
  Math.pow(health / 50, 3);
export const medicalHealthIncrease = 5; // per minute

// Food Collection & Distribution
export const foodCollectionCenters = [3, 4, 5, 6];
export const getFoodDistributionPriority = () => 1;
export const foodIncrease = 1 / 2;

// Reallocation
export const reallocationRepair = 1 / 10; // per minute

export const ambulanceSpeed = 2;
export const foodTruckSpeed = 2;
export const inspectionTruckSpeed = 2;
