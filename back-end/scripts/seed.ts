import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import Team from "../models/team.model.js";
import { TaskModel } from "../models/task.model.js";
import JoinRequest from "../models/joinRequest.model.js";
import { AssignRequestModel } from "../models/assignRequest.model.js";
import { initAuth } from "../config/auth.js";

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db!;
    const client = mongoose.connection.getClient();
    const auth = initAuth(db, client);

    // Clear existing data
    await db.collection("user").deleteMany({});
    await db.collection("session").deleteMany({});
    await db.collection("account").deleteMany({});
    await Team.deleteMany({});
    await TaskModel.deleteMany({});
    await JoinRequest.deleteMany({});
    await AssignRequestModel.deleteMany({});
    
    const ProjectModel = (await import("../models/project.model.js")).default;
    await ProjectModel.deleteMany({});
    
    console.log("Cleared existing data");

    // Create Users with authentication - Infor Sri Lanka Team
    const userConfigs = [
      { email: "rajitha.fernando@infor.com", name: "Rajitha Fernando", role: "Lead", jobTitle: "Engineering Manager" },
      { email: "kasun.perera@infor.com", name: "Kasun Perera", role: "Member", jobTitle: "Senior Software Engineer" },
      { email: "nimali.silva@infor.com", name: "Nimali Silva", role: "Member", jobTitle: "Full Stack Developer" },
      { email: "tharindu.jayasinghe@infor.com", name: "Tharindu Jayasinghe", role: "Member", jobTitle: "Backend Developer" },
      { email: "dilini.wickramasinghe@infor.com", name: "Dilini Wickramasinghe", role: "Member", jobTitle: "Frontend Developer" },
      { email: "pradeep.gunasekara@infor.com", name: "Pradeep Gunasekara", role: "Lead", jobTitle: "QA Manager" },
      { email: "sanduni.rathnayake@infor.com", name: "Sanduni Rathnayake", role: "Member", jobTitle: "QA Engineer" },
      { email: "chamara.bandara@infor.com", name: "Chamara Bandara", role: "Member", jobTitle: "Test Automation Engineer" },
      { email: "ruwan.dissanayake@infor.com", name: "Ruwan Dissanayake", role: "Lead", jobTitle: "DevOps Lead" },
      { email: "malsha.fernando@infor.com", name: "Malsha Fernando", role: "Member", jobTitle: "DevOps Engineer" },
      { email: "sachini.wijesinghe@infor.com", name: "Sachini Wijesinghe", role: "Member", jobTitle: "UI/UX Designer" },
      { email: "ashan.rodrigo@infor.com", name: "Ashan Rodrigo", role: "Member", jobTitle: "Business Analyst" },
    ];

    const users: any[] = [];
    for (const config of userConfigs) {
      const result = await auth.api.signUpEmail({
        body: {
          email: config.email,
          password: "password123",
          name: config.name,
          role: config.role,
          jobTitle: config.jobTitle,
        },
      });
      users.push({ _id: result.user.id, ...config });
    }

    console.log(`Created ${users.length} users`);

    const [rajitha, kasun, nimali, tharindu, dilini, pradeep, sanduni, chamara, ruwan, malsha] = users;

    // Create Teams
    const engineeringTeam = await Team.create({
      name: "Infor CloudSuite Engineering",
      description: "Core engineering team working on CloudSuite Industrial modules",
      createdBy: rajitha._id,
      members: [rajitha._id, kasun._id, nimali._id, tharindu._id, dilini._id],
    });

    const qaTeam = await Team.create({
      name: "Infor Quality Assurance",
      description: "QA team ensuring product quality and test automation",
      createdBy: pradeep._id,
      members: [pradeep._id, sanduni._id, chamara._id],
    });

    const devopsTeam = await Team.create({
      name: "Infor DevOps & Infrastructure",
      description: "DevOps team managing CI/CD pipelines and cloud infrastructure",
      createdBy: ruwan._id,
      members: [ruwan._id, malsha._id],
    });

    console.log("Created 3 teams");

    // Create Projects
    const cloudSuiteProject = await ProjectModel.create({
      name: "CloudSuite Industrial v23.4",
      description: "Major release with new features and performance improvements",
      teamId: engineeringTeam._id.toString(),
      createdBy: rajitha._id,
    });

    const apiGatewayProject = await ProjectModel.create({
      name: "API Gateway Modernization",
      description: "Modernize authentication and security layer",
      teamId: engineeringTeam._id.toString(),
      createdBy: rajitha._id,
    });

    const qaAutomationProject = await ProjectModel.create({
      name: "Test Automation Framework",
      description: "Build comprehensive automated testing suite",
      teamId: qaTeam._id.toString(),
      createdBy: pradeep._id,
    });

    const infraProject = await ProjectModel.create({
      name: "Cloud Infrastructure Upgrade",
      description: "Migrate to Kubernetes and modernize CI/CD",
      teamId: devopsTeam._id.toString(),
      createdBy: ruwan._id,
    });

    console.log("Created 4 projects");

    // Update users with teamIds
    await db.collection("user").updateMany(
      { _id: { $in: [rajitha._id, kasun._id, nimali._id, tharindu._id, dilini._id].map(id => new mongoose.Types.ObjectId(id)) } },
      { $set: { teamId: engineeringTeam._id.toString() } }
    );
    await db.collection("user").updateMany(
      { _id: { $in: [pradeep._id, sanduni._id, chamara._id].map(id => new mongoose.Types.ObjectId(id)) } },
      { $set: { teamId: qaTeam._id.toString() } }
    );
    await db.collection("user").updateMany(
      { _id: { $in: [ruwan._id, malsha._id].map(id => new mongoose.Types.ObjectId(id)) } },
      { $set: { teamId: devopsTeam._id.toString() } }
    );

    // Create Tasks for Engineering Team
    const engTasks = await TaskModel.create([
      {
        title: "Implement CloudSuite API Gateway Authentication",
        summary: "Add OAuth 2.0 authentication layer for CloudSuite API Gateway",
        description: "Implement secure OAuth 2.0 authentication mechanism for the CloudSuite API Gateway to ensure all API requests are properly authenticated and authorized. Include token refresh logic and rate limiting.",
        assigneeId: kasun._id,
        helperIds: [tharindu._id],
        status: "IN_PROGRESS",
        priority: "High",
        startDate: new Date("2025-01-20"),
        dueDate: new Date("2025-02-05"),
        reporterId: rajitha._id,
        teamId: engineeringTeam._id.toString(),
        projectId: apiGatewayProject._id.toString(),
        updates: [
          {
            date: new Date("2025-01-22"),
            note: "Completed OAuth 2.0 flow design and started implementation of token generation service",
            updatedBy: kasun._id,
          },
          {
            date: new Date("2025-01-24"),
            note: "Implemented JWT token generation and validation. Working on refresh token mechanism",
            updatedBy: kasun._id,
          },
        ],
      },
      {
        title: "Migrate CloudSuite Database to PostgreSQL 15",
        summary: "Upgrade database from PostgreSQL 12 to PostgreSQL 15 for performance improvements",
        description: "Plan and execute migration of CloudSuite production database from PostgreSQL 12 to PostgreSQL 15. Includes schema validation, data migration scripts, and rollback procedures.",
        assigneeId: tharindu._id,
        status: "BLOCKED",
        priority: "High",
        startDate: new Date("2025-01-15"),
        dueDate: new Date("2025-02-10"),
        reporterId: rajitha._id,
        teamId: engineeringTeam._id.toString(),
        projectId: cloudSuiteProject._id.toString(),
        updates: [
          {
            date: new Date("2025-01-23"),
            note: "Blocked waiting for DBA approval on migration window",
            blockedReason: "Waiting for database administrator approval for production migration window. Need 4-hour downtime window.",
            updatedBy: tharindu._id,
          },
        ],
      },
      {
        title: "Develop Inventory Management Dashboard",
        summary: "Create real-time inventory tracking dashboard for CloudSuite Industrial",
        description: "Build responsive dashboard showing real-time inventory levels, stock movements, and alerts for low stock items. Include data visualization with charts and export functionality.",
        assigneeId: nimali._id,
        helperIds: [dilini._id],
        status: "IN_PROGRESS",
        priority: "Medium",
        startDate: new Date("2025-01-18"),
        dueDate: new Date("2025-02-15"),
        reporterId: rajitha._id,
        teamId: engineeringTeam._id.toString(),
        projectId: cloudSuiteProject._id.toString(),
        updates: [
          {
            date: new Date("2025-01-20"),
            note: "Completed UI mockups and started React component development",
            updatedBy: nimali._id,
          },
          {
            date: new Date("2025-01-23"),
            note: "Implemented main dashboard layout and integrated Chart.js for data visualization",
            updatedBy: nimali._id,
          },
          {
            date: new Date("2025-01-24"),
            note: "Added real-time WebSocket connection for live inventory updates",
            updatedBy: dilini._id,
          },
        ],
      },
      {
        title: "Optimize CloudSuite Report Generation Performance",
        summary: "Improve report generation speed by 50% through query optimization",
        description: "Analyze and optimize slow-running SQL queries in report generation module. Implement database indexing, query caching, and pagination for large datasets.",
        assigneeId: tharindu._id,
        status: "TODO",
        priority: "Medium",
        startDate: new Date("2025-02-01"),
        dueDate: new Date("2025-02-20"),
        reporterId: rajitha._id,
        teamId: engineeringTeam._id.toString(),
        projectId: cloudSuiteProject._id.toString(),
      },
      {
        title: "Update CloudSuite User Documentation",
        summary: "Refresh user documentation for CloudSuite v23.4 release",
        description: "Update user guides, API documentation, and video tutorials to reflect new features in CloudSuite v23.4. Include screenshots and step-by-step instructions.",
        assigneeId: dilini._id,
        status: "TODO",
        priority: "Low",
        startDate: new Date("2025-02-05"),
        dueDate: new Date("2025-02-25"),
        reporterId: rajitha._id,
        teamId: engineeringTeam._id.toString(),
        projectId: cloudSuiteProject._id.toString(),
      },
      {
        title: "Fix Critical Security Vulnerability in Authentication Module",
        summary: "Patch SQL injection vulnerability in login endpoint",
        description: "Identified SQL injection vulnerability in authentication module. Implement parameterized queries and input validation to prevent SQL injection attacks.",
        assigneeId: kasun._id,
        status: "DONE",
        priority: "High",
        startDate: new Date("2025-01-10"),
        dueDate: new Date("2025-01-18"),
        reporterId: rajitha._id,
        teamId: engineeringTeam._id.toString(),
        projectId: apiGatewayProject._id.toString(),
        completedAt: new Date("2025-01-17"),
        updates: [
          {
            date: new Date("2025-01-12"),
            note: "Identified vulnerable code sections and created fix plan",
            updatedBy: kasun._id,
          },
          {
            date: new Date("2025-01-15"),
            note: "Implemented parameterized queries across all authentication endpoints",
            updatedBy: kasun._id,
          },
          {
            date: new Date("2025-01-17"),
            note: "Completed security testing and deployed fix to production",
            updatedBy: kasun._id,
          },
        ],
      },
      {
        title: "Implement Multi-Language Support for CloudSuite UI",
        summary: "Add internationalization support for Sinhala and Tamil languages",
        description: "Implement i18n framework to support Sinhala and Tamil languages in CloudSuite UI. Include language switcher and RTL support for Tamil.",
        assigneeId: dilini._id,
        status: "DONE",
        priority: "Medium",
        startDate: new Date("2025-01-05"),
        dueDate: new Date("2025-01-20"),
        reporterId: rajitha._id,
        teamId: engineeringTeam._id.toString(),
        projectId: cloudSuiteProject._id.toString(),
        completedAt: new Date("2025-01-19"),
        updates: [
          {
            date: new Date("2025-01-08"),
            note: "Set up react-i18next and created translation files for Sinhala and Tamil",
            updatedBy: dilini._id,
          },
          {
            date: new Date("2025-01-19"),
            note: "Completed all translations and tested language switching functionality",
            updatedBy: dilini._id,
          },
        ],
      },
    ]);

    // Create Tasks for QA Team
    const qaTasks = await TaskModel.create([
      {
        title: "Automate Regression Test Suite for CloudSuite v23.4",
        summary: "Create automated test scripts for all critical user flows",
        description: "Develop comprehensive automated regression test suite using Selenium and Cypress for CloudSuite v23.4 release. Cover all critical business workflows.",
        assigneeId: chamara._id,
        helperIds: [sanduni._id],
        status: "IN_PROGRESS",
        priority: "High",
        startDate: new Date("2025-01-15"),
        dueDate: new Date("2025-02-08"),
        reporterId: pradeep._id,
        teamId: qaTeam._id.toString(),
        projectId: qaAutomationProject._id.toString(),
        updates: [
          {
            date: new Date("2025-01-18"),
            note: "Completed test case design for inventory management module",
            updatedBy: chamara._id,
          },
          {
            date: new Date("2025-01-23"),
            note: "Implemented 45 automated test cases covering order processing workflows",
            updatedBy: chamara._id,
          },
        ],
      },
      {
        title: "Performance Testing for CloudSuite API Gateway",
        summary: "Conduct load testing to ensure API can handle 10,000 concurrent users",
        description: "Execute performance testing using JMeter to validate API Gateway can handle expected production load of 10,000 concurrent users with response time under 200ms.",
        assigneeId: sanduni._id,
        status: "TODO",
        priority: "High",
        startDate: new Date("2025-02-01"),
        dueDate: new Date("2025-02-12"),
        reporterId: pradeep._id,
        teamId: qaTeam._id.toString(),
        projectId: qaAutomationProject._id.toString(),
      },
      {
        title: "Security Penetration Testing for CloudSuite",
        summary: "Conduct comprehensive security audit and penetration testing",
        description: "Perform security penetration testing covering OWASP Top 10 vulnerabilities, authentication bypass attempts, and data exposure risks.",
        assigneeId: sanduni._id,
        status: "DONE",
        priority: "High",
        startDate: new Date("2025-01-08"),
        dueDate: new Date("2025-01-22"),
        reporterId: pradeep._id,
        teamId: qaTeam._id.toString(),
        projectId: qaAutomationProject._id.toString(),
        completedAt: new Date("2025-01-21"),
        updates: [
          {
            date: new Date("2025-01-21"),
            note: "Completed penetration testing. Found and reported 3 medium-severity vulnerabilities to engineering team",
            updatedBy: sanduni._id,
          },
        ],
      },
    ]);

    // Create Tasks for DevOps Team
    const devopsTasks = await TaskModel.create([
      {
        title: "Set Up Kubernetes Cluster for CloudSuite Production",
        summary: "Deploy production-ready Kubernetes cluster on AWS EKS",
        description: "Configure and deploy highly available Kubernetes cluster on AWS EKS for CloudSuite production environment. Include auto-scaling, monitoring, and disaster recovery setup.",
        assigneeId: malsha._id,
        status: "IN_PROGRESS",
        priority: "High",
        startDate: new Date("2025-01-12"),
        dueDate: new Date("2025-02-02"),
        reporterId: ruwan._id,
        teamId: devopsTeam._id.toString(),
        projectId: infraProject._id.toString(),
        updates: [
          {
            date: new Date("2025-01-20"),
            note: "Completed EKS cluster setup with 3 worker nodes. Configured ingress controller and cert-manager",
            updatedBy: malsha._id,
          },
          {
            date: new Date("2025-01-24"),
            note: "Implemented Prometheus and Grafana for cluster monitoring. Setting up auto-scaling policies",
            updatedBy: malsha._id,
          },
        ],
      },
      {
        title: "Implement CI/CD Pipeline for CloudSuite Microservices",
        summary: "Create automated deployment pipeline using GitHub Actions",
        description: "Build end-to-end CI/CD pipeline for CloudSuite microservices using GitHub Actions. Include automated testing, security scanning, and blue-green deployment strategy.",
        assigneeId: ruwan._id,
        status: "IN_PROGRESS",
        priority: "High",
        startDate: new Date("2025-01-18"),
        dueDate: new Date("2025-02-10"),
        reporterId: ruwan._id,
        teamId: devopsTeam._id.toString(),
        projectId: infraProject._id.toString(),
        updates: [
          {
            date: new Date("2025-01-22"),
            note: "Configured GitHub Actions workflows for build and test stages. Integrated SonarQube for code quality checks",
            updatedBy: ruwan._id,
          },
        ],
      },
      {
        title: "Configure AWS CloudWatch Alerts for Production Monitoring",
        summary: "Set up comprehensive monitoring and alerting for production systems",
        description: "Configure CloudWatch alarms for CPU usage, memory utilization, API response times, and error rates. Integrate with PagerDuty for on-call notifications.",
        assigneeId: malsha._id,
        status: "TODO",
        priority: "Medium",
        startDate: new Date("2025-02-03"),
        dueDate: new Date("2025-02-15"),
        reporterId: ruwan._id,
        teamId: devopsTeam._id.toString(),
        projectId: infraProject._id.toString(),
      },
    ]);

    console.log(`Created ${engTasks.length + qaTasks.length + devopsTasks.length} tasks`);

    // Create Subtasks for main tasks
    await TaskModel.create([
      {
        title: "Design OAuth 2.0 Flow Diagram",
        summary: "Create technical design document for OAuth implementation",
        description: "Document OAuth 2.0 authorization flow, token lifecycle, and security considerations",
        assigneeId: kasun._id,
        status: "DONE",
        priority: "High",
        startDate: new Date("2025-01-20"),
        dueDate: new Date("2025-01-22"),
        reporterId: kasun._id,
        teamId: engineeringTeam._id.toString(),
        parentTaskId: engTasks[0]._id.toString(),
        isSubtask: true,
        completedAt: new Date("2025-01-22"),
      },
      {
        title: "Implement Token Generation Service",
        summary: "Build JWT token generation microservice",
        description: "Create microservice for generating and signing JWT tokens",
        assigneeId: kasun._id,
        status: "DONE",
        priority: "High",
        startDate: new Date("2025-01-22"),
        dueDate: new Date("2025-01-24"),
        reporterId: kasun._id,
        teamId: engineeringTeam._id.toString(),
        parentTaskId: engTasks[0]._id.toString(),
        isSubtask: true,
        completedAt: new Date("2025-01-24"),
      },
      {
        title: "Implement Token Refresh Mechanism",
        summary: "Add refresh token logic for seamless user experience",
        description: "Implement refresh token endpoint and automatic token renewal",
        assigneeId: tharindu._id,
        status: "IN_PROGRESS",
        priority: "High",
        startDate: new Date("2025-01-24"),
        dueDate: new Date("2025-01-28"),
        reporterId: kasun._id,
        teamId: engineeringTeam._id.toString(),
        parentTaskId: engTasks[0]._id.toString(),
        isSubtask: true,
      },
      {
        title: "Add Rate Limiting Middleware",
        summary: "Implement rate limiting to prevent API abuse",
        description: "Add rate limiting middleware using Redis for distributed rate limiting",
        assigneeId: kasun._id,
        status: "TODO",
        priority: "High",
        startDate: new Date("2025-01-28"),
        dueDate: new Date("2025-02-02"),
        reporterId: kasun._id,
        teamId: engineeringTeam._id.toString(),
        parentTaskId: engTasks[0]._id.toString(),
        isSubtask: true,
      },
    ]);

    console.log("Created subtasks");

    // Create Join Requests
    await JoinRequest.create([
      {
        userId: users[10]._id,
        teamId: engineeringTeam._id,
        status: "pending",
      },
      {
        userId: users[11]._id,
        teamId: qaTeam._id,
        status: "pending",
      },
    ]);

    console.log("Created join requests");

    // Create Assign/Help Requests
    await AssignRequestModel.create([
      {
        taskId: engTasks[1]._id,
        requesterId: tharindu._id,
        teamId: engineeringTeam._id.toString(),
        suggestedMemberIds: [kasun._id],
        note: "Need help coordinating with DBA team to schedule migration window. Kasun has experience with similar migrations.",
        status: "pending",
      },
    ]);

    console.log("Created assign requests");

    console.log("\n✅ Seed completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`- Users: ${users.length}`);
    console.log(`- Teams: 3 (Engineering, QA, DevOps)`);
    console.log(`- Projects: 4`);
    console.log(`- Tasks: ${engTasks.length + qaTasks.length + devopsTasks.length}`);
    console.log(`- Subtasks: 4`);
    console.log(`- Join Requests: 2`);
    console.log(`- Help Requests: 1`);
    console.log("\n🔐 Login Credentials (use any email with password: password123):");
    console.log("Lead: rajitha.fernando@infor.com");
    console.log("Member: kasun.perera@infor.com");

    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
}

seed();
