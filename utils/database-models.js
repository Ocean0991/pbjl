const DatabaseModels = {
  User: {
    collection: 'users',
    schema: {
      _id: '',
      openid: '',
      unionid: '',
      nickname: '',
      avatar: '',
      gender: '',
      birthYear: 0,
      height: 0,
      weight: 0,
      createdAt: '',
      updatedAt: '',
      lastLoginAt: '',
      subscription: {
        type: 'free',
        startDate: '',
        endDate: '',
        autoRenew: false
      }
    }
  },

  RunnerProfile: {
    collection: 'runner_profiles',
    schema: {
      _id: '',
      userId: '',
      displayName: '',
      gender: '',
      birthYear: 0,
      heightCm: 0,
      weightKg: 0,
      longestRunKm: 0,
      recentWeeklyRuns: 0,
      recentWeeklyMileage: 0,
      hasRun10k: false,
      trainingDaysPerWeek: 3,
      preferredTrainingDays: [],
      maxHeartRate: 0,
      restingHeartRate: 0,
      lactateThresholdHr: 0,
      vo2Max: 0,
      hrv: 0,
      sleepHours: 0,
      symptomStatus: 'steady',
      injuryStatus: 'none',
      createdAt: '',
      updatedAt: ''
    }
  },

  RaceGoal: {
    collection: 'race_goals',
    schema: {
      _id: '',
      userId: '',
      priority: 'A',
      raceName: '',
      raceDate: '',
      raceType: 'half_marathon',
      targetTime: 0,
      goalType: 'standard_finish',
      location: '',
      elevation: 0,
      weather: {
        temperature: 0,
        humidity: 0
      },
      status: 'active',
      createdAt: '',
      updatedAt: ''
    }
  },

  AvailabilityRule: {
    collection: 'availability_rules',
    schema: {
      _id: '',
      userId: '',
      dayOfWeek: 0,
      available: true,
      preferredTime: '',
      notes: ''
    }
  },

  BlackoutDate: {
    collection: 'blackout_dates',
    schema: {
      _id: '',
      userId: '',
      date: '',
      reason: '',
      type: 'travel',
      createdAt: ''
    }
  },

  PlanVersion: {
    collection: 'plan_versions',
    schema: {
      _id: '',
      userId: '',
      version: 1,
      goalType: 'standard_finish',
      generatedAt: '',
      startDate: '',
      endDate: '',
      status: 'active',
      rebuildReason: '',
      weeks: [],
      tasksByDate: {},
      createdAt: '',
      updatedAt: ''
    }
  },

  TrainingWeek: {
    collection: 'training_weeks',
    schema: {
      _id: '',
      planId: '',
      userId: '',
      weekIndex: 1,
      startDate: '',
      endDate: '',
      phase: 'base',
      focus: '',
      longRunTarget: 0,
      totalDistance: 0,
      status: 'planned',
      createdAt: ''
    }
  },

  Workout: {
    collection: 'workouts',
    schema: {
      _id: '',
      planId: '',
      userId: '',
      dateKey: '',
      weekIndex: 1,
      type: 'easy',
      title: '',
      target: '',
      purpose: '',
      distance: 0,
      duration: 0,
      priority: 'normal',
      trackable: true,
      paceTarget: null,
      heartRateTarget: null,
      status: 'planned',
      createdAt: ''
    }
  },

  WorkoutExecution: {
    collection: 'workout_executions',
    schema: {
      _id: '',
      workoutId: '',
      userId: '',
      dateKey: '',
      startTime: '',
      endTime: '',
      distance: 0,
      duration: 0,
      avgPace: 0,
      avgHeartRate: 0,
      maxHeartRate: 0,
      calories: 0,
      elevation: 0,
      gpsTrack: [],
      splits: [],
      status: 'completed',
      source: 'manual',
      deviceInfo: {},
      createdAt: ''
    }
  },

  PostWorkoutFeedback: {
    collection: 'post_workout_feedbacks',
    schema: {
      _id: '',
      workoutId: '',
      userId: '',
      dateKey: '',
      completion: 'full',
      rpe: 0,
      feeling: 'normal',
      issue: '',
      notes: '',
      discomfortAreas: [],
      weather: '',
      createdAt: ''
    }
  },

  LoadSnapshot: {
    collection: 'load_snapshots',
    schema: {
      _id: '',
      userId: '',
      dateKey: '',
      dailyLoad: 0,
      atl: 0,
      ctl: 0,
      tsb: 0,
      weeklyLoad: 0,
      monthlyLoad: 0,
      createdAt: ''
    }
  },

  ThresholdProfile: {
    collection: 'threshold_profiles',
    schema: {
      _id: '',
      userId: '',
      lt1: {
        heartRate: 0,
        pace: 0
      },
      lt2: {
        heartRate: 0,
        pace: 0
      },
      maxHeartRate: 0,
      restingHeartRate: 0,
      paceZones: {
        recovery: '',
        easy: '',
        longRun: '',
        tempo: '',
        interval: ''
      },
      heartRateZones: {
        recovery: { min: 0, max: 0 },
        easy: { min: 0, max: 0 },
        long: { min: 0, max: 0 },
        quality: { min: 0, max: 0 }
      },
      updatedAt: ''
    }
  },

  PredictionSnapshot: {
    collection: 'prediction_snapshots',
    schema: {
      _id: '',
      userId: '',
      dateKey: '',
      predictions: {
        '5k': { time: 0, confidence: 0 },
        '10k': { time: 0, confidence: 0 },
        'half_marathon': { time: 0, confidence: 0 },
        'marathon': { time: 0, confidence: 0 }
      },
      basedOn: {
        recentRaces: [],
        recentTraining: {},
        currentFitness: 0
      },
      createdAt: ''
    }
  },

  CoachMessage: {
    collection: 'coach_messages',
    schema: {
      _id: '',
      userId: '',
      sessionId: '',
      role: 'user',
      content: '',
      context: {
        currentDate: '',
        currentPlan: '',
        recentTraining: [],
        riskLevel: ''
      },
      createdAt: ''
    }
  },

  AudioScript: {
    collection: 'audio_scripts',
    schema: {
      _id: '',
      workoutId: '',
      userId: '',
      type: 'start',
      trigger: {
        type: 'time',
        value: 0
      },
      content: '',
      voice: 'default',
      createdAt: ''
    }
  },

  Shoe: {
    collection: 'shoes',
    schema: {
      _id: '',
      userId: '',
      brand: '',
      model: '',
      nickname: '',
      purchaseDate: '',
      maxMileage: 800,
      currentMileage: 0,
      status: 'active',
      isDefault: false,
      createdAt: '',
      updatedAt: ''
    }
  },

  Group: {
    collection: 'groups',
    schema: {
      _id: '',
      name: '',
      description: '',
      type: 'training',
      ownerId: '',
      members: [],
      planId: '',
      settings: {
        isPublic: true,
        requireApproval: false
      },
      stats: {
        memberCount: 0,
        totalDistance: 0
      },
      createdAt: '',
      updatedAt: ''
    }
  },

  CoachProfile: {
    collection: 'coach_profiles',
    schema: {
      _id: '',
      userId: '',
      displayName: '',
      avatar: '',
      bio: '',
      certifications: [],
      specializations: [],
      experience: 0,
      rating: 0,
      reviewCount: 0,
      pricePerSession: 0,
      availability: [],
      createdAt: '',
      updatedAt: ''
    }
  },

  PlanTemplate: {
    collection: 'plan_templates',
    schema: {
      _id: '',
      coachId: '',
      title: '',
      description: '',
      raceType: 'half_marathon',
      duration: 12,
      difficulty: 'intermediate',
      price: 0,
      downloads: 0,
      rating: 0,
      reviews: [],
      weeks: [],
      createdAt: '',
      updatedAt: ''
    }
  },

  Subscription: {
    collection: 'subscriptions',
    schema: {
      _id: '',
      userId: '',
      type: 'pro',
      startDate: '',
      endDate: '',
      status: 'active',
      paymentMethod: '',
      transactionId: '',
      autoRenew: true,
      createdAt: '',
      updatedAt: ''
    }
  },

  EventRegistration: {
    collection: 'event_registrations',
    schema: {
      _id: '',
      userId: '',
      raceId: '',
      raceName: '',
      raceDate: '',
      bibNumber: '',
      status: 'registered',
      expoInfo: {
        date: '',
        location: '',
        notes: ''
      },
      result: {
        finishTime: 0,
        gunTime: 0,
        pace: 0,
        place: 0,
        photos: [],
        certificate: ''
      },
      createdAt: '',
      updatedAt: ''
    }
  }
};

module.exports = DatabaseModels;
