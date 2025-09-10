const Job = require('../models/Job');
const Resume = require('../models/Resume');
const nlpService = require('../services/nlpService');
const similarityService = require('../services/similarityService');
const logger = require('../utils/logger');

class JobController {
  async createJob(req, res) {
    try {
      const {
        title,
        company,
        description,
        requirements,
        location,
        salary,
        type
      } = req.body;

      const job = new Job({
        title,
        company,
        description,
        requirements,
        location,
        salary,
        type,
        postedBy: req.user.id
      });

      await job.save();

      logger.info(`Job created: ${title} at ${company}`);

      res.status(201).json({
        success: true,
        message: 'Job posted successfully',
        data: job
      });

    } catch (error) {
      logger.error('Job creation failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create job',
        error: error.message
      });
    }
  }

  async getJobs(req, res) {
    try {
      const { page = 1, limit = 10, location, type, skills } = req.query;
      const skip = (page - 1) * limit;

      let query = { isActive: true };

      // Add filters
      if (location) {
        query.location = { $regex: location, $options: 'i' };
      }
      if (type) {
        query.type = type;
      }
      if (skills) {
        const skillsArray = skills.split(',').map(s => s.trim());
        query['requirements.skills'] = { $in: skillsArray };
      }

      const jobs = await Job.find(query)
        .populate('postedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Job.countDocuments(query);

      res.json({
        success: true,
        data: {
          jobs,
          pagination: {
            current: parseInt(page),
            total: Math.ceil(total / limit),
            count: jobs.length,
            totalJobs: total
          }
        }
      });

    } catch (error) {
      logger.error('Failed to get jobs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve jobs'
      });
    }
  }

  async getJobById(req, res) {
    try {
      const { jobId } = req.params;

      const job = await Job.findOne({
        _id: jobId,
        isActive: true
      }).populate('postedBy', 'name email');

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      res.json({
        success: true,
        data: job
      });

    } catch (error) {
      logger.error('Failed to get job:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve job'
      });
    }
  }

  async applyToJob(req, res) {
    try {
      const { jobId } = req.params;
      const { resumeId } = req.body;
      const userId = req.user.id;

      // Verify job exists
      const job = await Job.findOne({ _id: jobId, isActive: true });
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Verify resume belongs to user
      const resume = await Resume.findOne({
        _id: resumeId,
        userId,
        isActive: true
      });

      if (!resume) {
        return res.status(404).json({
          success: false,
          message: 'Resume not found'
        });
      }

      // Check if already applied
      const existingApplication = job.applicants.find(
        app => app.userId.toString() === userId
      );

      if (existingApplication) {
        return res.status(400).json({
          success: false,
          message: 'You have already applied to this job'
        });
      }

      // Calculate match score
      const matchResult = similarityService.calculateJobMatch(
        resume.extractedData,
        job.requirements
      );

      // Generate candidate brief
      const candidateBrief = await nlpService.generateCandidateBrief(resume.extractedData);

      // Add application to job
      job.applicants.push({
        userId,
        resumeId,
        matchScore: matchResult.finalScore,
        candidateBrief,
        status: 'applied'
      });

      await job.save();

      logger.info(`User ${userId} applied to job ${jobId}`);

      res.json({
        success: true,
        message: 'Application submitted successfully',
        data: {
          matchScore: matchResult.finalScore,
          matchDetails: matchResult,
          applicationStatus: 'applied'
        }
      });

    } catch (error) {
      logger.error('Job application failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to apply to job'
      });
    }
  }

  async getJobApplicants(req, res) {
    try {
      const { jobId } = req.params;
      const userId = req.user.id;

      const job = await Job.findOne({
        _id: jobId,
        postedBy: userId,
        isActive: true
      }).populate({
        path: 'applicants.userId',
        select: 'name email profile'
      }).populate({
        path: 'applicants.resumeId',
        select: 'extractedData fileName'
      });

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found or unauthorized'
        });
      }

      // Sort applicants by match score
      const sortedApplicants = job.applicants.sort((a, b) => b.matchScore - a.matchScore);

      res.json({
        success: true,
        data: {
          job: {
            title: job.title,
            company: job.company,
            location: job.location
          },
          applicants: sortedApplicants
        }
      });

    } catch (error) {
      logger.error('Failed to get job applicants:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve applicants'
      });
    }
  }

  async updateJobStatus(req, res) {
    try {
      const { jobId } = req.params;
      const { isActive } = req.body;
      const userId = req.user.id;

      const job = await Job.findOneAndUpdate(
        { _id: jobId, postedBy: userId },
        { isActive },
        { new: true }
      );

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found or unauthorized'
        });
      }

      res.json({
        success: true,
        message: `Job ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: job
      });

    } catch (error) {
      logger.error('Failed to update job status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update job status'
      });
    }
  }
}

module.exports = new JobController();