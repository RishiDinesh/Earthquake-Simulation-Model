import uuid from "react-uuid";

const getRandomNumber = () => Math.floor(Math.random() * 500);

export const getTestInfo = () => {
  const peopleIds = Array(20).map(() => uuid());
  const info = {
    completedAt: performance.now() + 2000,
    survivorsCount: 19,
    deadCount: 1,
    evacuation: [],
    firstAid: {},
    medicalCamp: {},
    foodCollection: [],
    foodDistribution: {},
  };

  for (let i = 0; i < 5; i++) {
    info.evacuation.push({
      id: uuid(),
      arrivalTime: getRandomNumber(),
      burstTime: getRandomNumber(),
      waitingTime: getRandomNumber(),
      turnAroundTime: getRandomNumber(),
      completionTime: getRandomNumber(),
    });
    info.foodCollection.push({
      id: uuid(),
      arrivalTime: getRandomNumber(),
      burstTime: getRandomNumber(),
      waitingTime: getRandomNumber(),
      turnAroundTime: getRandomNumber(),
      completionTime: getRandomNumber(),
    });
  }

  for (let i = 0; i < 20; i++) {
    const obj = {
      arrivalTime: getRandomNumber(),
      burstTime: getRandomNumber(),
      waitingTime: getRandomNumber(),
      turnAroundTime: getRandomNumber(),
      completionTime: getRandomNumber(),
    };
    const id = uuid();

    info.firstAid[id] = obj;
    info.medicalCamp[id] = obj;
    info.foodDistribution[id] = obj;
  }

  return info;
};
