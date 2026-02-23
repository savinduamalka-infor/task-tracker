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

    // Create Users
    const userConfigs = [
      // AppXpress Team
      { email: "rajitha.fernando@infor.com", name: "Rajitha Fernando", role: "Lead", jobTitle: "Engineering Manager" },
      { email: "savindu.amalka@infor.com", name: "Savindu Amalka", role: "Member", jobTitle: "Development Intern" },
      { email: "kasun.perera@infor.com", name: "Kasun Perera", role: "Member", jobTitle: "Senior Software Engineer" },
      { email: "nimali.silva@infor.com", name: "Nimali Silva", role: "Member", jobTitle: "Software Engineer" },
      { email: "tharindu.jayasinghe@infor.com", name: "Tharindu Jayasinghe", role: "Member", jobTitle: "Software Engineer" },
      { email: "dilini.wickramasinghe@infor.com", name: "Dilini Wickramasinghe", role: "Member", jobTitle: "Frontend Developer" },
      { email: "chaminda.rathnayake@infor.com", name: "Chaminda Rathnayake", role: "Member", jobTitle: "Backend Developer" },
      { email: "sanduni.fernando@infor.com", name: "Sanduni Fernando", role: "Member", jobTitle: "Full Stack Developer" },
      { email: "thilini.jayasuriya@infor.com", name: "Thilini Jayasuriya", role: "Member", jobTitle: "UI/UX Designer" },
      { email: "ruwan.bandara@infor.com", name: "Ruwan Bandara", role: "Member", jobTitle: "Quality Assurance Analyst" },
      { email: "malsha.wijesinghe@infor.com", name: "Malsha Wijesinghe", role: "Member", jobTitle: "Technical Writer" },
      
      // CloudSuite Industrial Team
      { email: "pradeep.gunasekara@infor.com", name: "Pradeep Gunasekara", role: "Lead", jobTitle: "Product Manager" },
      { email: "ashan.perera@infor.com", name: "Ashan Perera", role: "Member", jobTitle: "Senior Software Engineer" },
      { email: "sachini.de.silva@infor.com", name: "Sachini De Silva", role: "Member", jobTitle: "Business Analyst" },
      { email: "nuwan.jayawardena@infor.com", name: "Nuwan Jayawardena", role: "Member", jobTitle: "Software Engineer" },
      { email: "ishara.kumari@infor.com", name: "Ishara Kumari", role: "Member", jobTitle: "Quality Assurance Analyst" },
      
      // Infrastructure Team
      { email: "ruwan.dissanayake@infor.com", name: "Ruwan Dissanayake", role: "Lead", jobTitle: "DevOps Manager" },
      { email: "lakshan.silva@infor.com", name: "Lakshan Silva", role: "Member", jobTitle: "DevOps Engineer" },
      { email: "nadeeka.fernando@infor.com", name: "Nadeeka Fernando", role: "Member", jobTitle: "Cloud Engineer" },
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

    const [rajitha, savindu, kasun, nimali, tharindu, dilini, chaminda, sanduni, thilini, ruwan, malsha, 
           pradeep, ashan, sachini, nuwan, ishara, 
           ruwanD, lakshan, nadeeka] = users;

    // Create Teams
    const appXpressTeam = await Team.create({
      name: "AppXpress",
      description: "Low-code development platform team for rapid application development on CloudSuite",
      createdBy: rajitha._id,
      members: [rajitha._id, savindu._id, kasun._id, nimali._id, tharindu._id, dilini._id, chaminda._id, sanduni._id, thilini._id, ruwan._id, malsha._id],
    });

    const cloudSuiteTeam = await Team.create({
      name: "CloudSuite Industrial",
      description: "Enterprise resource planning and supply chain management solutions",
      createdBy: pradeep._id,
      members: [pradeep._id, ashan._id, sachini._id, nuwan._id, ishara._id],
    });

    const infraTeam = await Team.create({
      name: "Infrastructure",
      description: "Cloud infrastructure, DevOps, and platform engineering",
      createdBy: ruwanD._id,
      members: [ruwanD._id, lakshan._id, nadeeka._id],
    });

    console.log("Created 3 teams");

    // Create Projects
    const formBuilderProject = await ProjectModel.create({
      name: "Form Builder v2.0",
      description: "Next-generation drag-and-drop form builder with advanced validation",
      teamId: appXpressTeam._id.toString(),
      createdBy: rajitha._id,
    });

    const workflowEngineProject = await ProjectModel.create({
      name: "Workflow Automation Engine",
      description: "Visual workflow designer for business process automation",
      teamId: appXpressTeam._id.toString(),
      createdBy: rajitha._id,
    });

    const mobileAppProject = await ProjectModel.create({
      name: "Mobile SDK",
      description: "Native mobile SDK for iOS and Android app development",
      teamId: appXpressTeam._id.toString(),
      createdBy: rajitha._id,
    });

    const cloudSuiteProject = await ProjectModel.create({
      name: "CloudSuite Industrial v23.4",
      description: "ERP system for manufacturing and distribution companies",
      teamId: cloudSuiteTeam._id.toString(),
      createdBy: pradeep._id,
    });

    const infraProject = await ProjectModel.create({
      name: "AWS Migration",
      description: "Migrate on-premise infrastructure to AWS cloud",
      teamId: infraTeam._id.toString(),
      createdBy: ruwanD._id,
    });

    console.log("Created 5 projects");

    // Update users with teamIds
    await db.collection("user").updateMany(
      { _id: { $in: [rajitha, savindu, kasun, nimali, tharindu, dilini, chaminda, sanduni, thilini, ruwan, malsha].map(u => new mongoose.Types.ObjectId(u._id)) } },
      { $set: { teamId: appXpressTeam._id.toString() } }
    );
    await db.collection("user").updateMany(
      { _id: { $in: [pradeep, ashan, sachini, nuwan, ishara].map(u => new mongoose.Types.ObjectId(u._id)) } },
      { $set: { teamId: cloudSuiteTeam._id.toString() } }
    );
    await db.collection("user").updateMany(
      { _id: { $in: [ruwanD, lakshan, nadeeka].map(u => new mongoose.Types.ObjectId(u._id)) } },
      { $set: { teamId: infraTeam._id.toString() } }
    );

    // Create Tasks
    const tasks = await TaskModel.create([
      // AppXpress Team Tasks
      {
        title: "Build Drag-and-Drop Form Designer Component",
        summary: "Create React-based visual form builder with drag-and-drop functionality",
        description: "Develop intuitive drag-and-drop interface for Form Builder v2.0. Support field types: text, number, date, dropdown, checkbox, file upload. Include real-time preview and responsive design.",
        assigneeId: dilini._id,
        helperIds: [thilini._id],
        status: "IN_PROGRESS",
        priority: "High",
        startDate: new Date("2025-01-15"),
        dueDate: new Date("2025-02-10"),
        reporterId: rajitha._id,
        teamId: appXpressTeam._id.toString(),
        projectId: formBuilderProject._id.toString(),
        updates: [
          {
            date: new Date("2025-01-20"),
            note: "Completed UI mockups and component architecture design. Started implementing drag-and-drop using react-beautiful-dnd library",
            updatedBy: dilini._id,
          },
          {
            date: new Date("2025-01-24"),
            note: "Implemented 8 field types with drag-and-drop. Working on field property editor panel",
            updatedBy: dilini._id,
          },
        ],
      },
      {
        title: "Implement Form Validation Engine",
        summary: "Build advanced validation rules engine for form fields",
        description: "Create flexible validation engine supporting regex patterns, conditional logic, cross-field validation, and custom JavaScript validators. Include real-time validation feedback.",
        assigneeId: chaminda._id,
        helperIds: [kasun._id],
        status: "IN_PROGRESS",
        priority: "High",
        startDate: new Date("2025-01-18"),
        dueDate: new Date("2025-02-08"),
        reporterId: rajitha._id,
        teamId: appXpressTeam._id.toString(),
        projectId: formBuilderProject._id.toString(),
        updates: [
          {
            date: new Date("2025-01-22"),
            note: "Completed validation rule parser. Implemented regex and required field validators",
            updatedBy: chaminda._id,
          },
          {
            date: new Date("2025-01-24"),
            note: "Added conditional validation logic. Working on cross-field validation dependencies",
            updatedBy: chaminda._id,
          },
        ],
      },
      {
        title: "Design Workflow Visual Editor UI",
        summary: "Create intuitive visual workflow designer interface",
        description: "Design and prototype visual workflow editor with node-based interface. Support drag-and-drop nodes for actions, conditions, loops, and integrations. Include zoom, pan, and auto-layout features.",
        assigneeId: thilini._id,
        helperIds: [dilini._id],
        status: "IN_PROGRESS",
        priority: "High",
        startDate: new Date("2025-01-10"),
        dueDate: new Date("2025-02-05"),
        reporterId: rajitha._id,
        teamId: appXpressTeam._id.toString(),
        projectId: workflowEngineProject._id.toString(),
        updates: [
          {
            date: new Date("2025-01-15"),
            note: "Completed wireframes for workflow editor. Created high-fidelity mockups in Figma",
            updatedBy: thilini._id,
          },
          {
            date: new Date("2025-01-23"),
            note: "Finalized node designs and connection styles. Started React Flow implementation",
            updatedBy: dilini._id,
          },
        ],
      },
      {
        title: "Develop Workflow Execution Engine",
        summary: "Build backend engine to execute workflow definitions",
        description: "Implement workflow execution engine with support for sequential and parallel execution, error handling, retry logic, and state persistence. Use Node.js with Bull queue for job processing.",
        assigneeId: chaminda._id,
        status: "BLOCKED",
        priority: "High",
        startDate: new Date("2025-01-20"),
        dueDate: new Date("2025-02-15"),
        reporterId: rajitha._id,
        teamId: appXpressTeam._id.toString(),
        projectId: workflowEngineProject._id.toString(),
        updates: [
          {
            date: new Date("2025-01-24"),
            note: "Blocked - waiting for infrastructure team to provision Redis cluster for Bull queue",
            updatedBy: chaminda._id,
            blockedReason: "Redis cluster not available",
          },
        ],
      },
      {
        title: "Build iOS SDK for Mobile App Development",
        summary: "Create native iOS SDK with Swift",
        description: "Develop iOS SDK for mobile applications. Include UI components, data sync, offline support, and authentication modules. Support iOS 14+.",
        assigneeId: kasun._id,
        status: "IN_PROGRESS",
        priority: "Medium",
        startDate: new Date("2025-01-12"),
        dueDate: new Date("2025-02-20"),
        reporterId: rajitha._id,
        teamId: appXpressTeam._id.toString(),
        projectId: mobileAppProject._id.toString(),
        updates: [
          {
            date: new Date("2025-01-18"),
            note: "Completed authentication module and data sync framework. Working on UI component library",
            updatedBy: kasun._id,
          },
        ],
      },
      {
        title: "Implement Form Conditional Logic Engine",
        summary: "Add show/hide field logic based on user input",
        description: "Build conditional logic engine for forms - show/hide fields, enable/disable inputs, and change field properties based on other field values. Support complex AND/OR conditions.",
        assigneeId: savindu._id,
        helperIds: [nimali._id],
        status: "IN_PROGRESS",
        priority: "Medium",
        startDate: new Date("2025-01-22"),
        dueDate: new Date("2025-02-12"),
        reporterId: rajitha._id,
        teamId: appXpressTeam._id.toString(),
        projectId: formBuilderProject._id.toString(),
        updates: [
          {
            date: new Date("2025-01-24"),
            note: "Implemented condition parser and basic show/hide logic. Testing with sample forms",
            updatedBy: savindu._id,
          },
        ],
      },
      {
        title: "Design Mobile App Component Library",
        summary: "Create reusable UI components for mobile SDK",
        description: "Design consistent UI component library for mobile apps - buttons, inputs, cards, lists, modals. Follow iOS and Android design guidelines.",
        assigneeId: thilini._id,
        status: "TODO",
        priority: "Medium",
        startDate: new Date("2025-01-25"),
        dueDate: new Date("2025-02-18"),
        reporterId: rajitha._id,
        teamId: appXpressTeam._id.toString(),
        projectId: mobileAppProject._id.toString(),
      },
      {
        title: "Write API Documentation for Form Builder",
        summary: "Document REST APIs for form creation and submission",
        description: "Create comprehensive API documentation for Form Builder endpoints. Include request/response examples, error codes, and authentication details. Use OpenAPI 3.0 specification.",
        assigneeId: malsha._id,
        status: "TODO",
        priority: "Low",
        startDate: new Date("2025-02-01"),
        dueDate: new Date("2025-02-15"),
        reporterId: rajitha._id,
        teamId: appXpressTeam._id.toString(),
        projectId: formBuilderProject._id.toString(),
      },
      {
        title: "Implement QA Automation Framework",
        summary: "Set up automated testing for form builder",
        description: "Build end-to-end test automation framework using Playwright. Cover form creation, validation, submission, and conditional logic scenarios.",
        assigneeId: ruwan._id,
        status: "IN_PROGRESS",
        priority: "High",
        startDate: new Date("2025-01-16"),
        dueDate: new Date("2025-02-05"),
        reporterId: rajitha._id,
        teamId: appXpressTeam._id.toString(),
        projectId: formBuilderProject._id.toString(),
        updates: [
          {
            date: new Date("2025-01-23"),
            note: "Set up Playwright framework and created 15 test cases for form creation and validation",
            updatedBy: ruwan._id,
          },
        ],
      },
      
      // CloudSuite Industrial Team Tasks
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
        reporterId: pradeep._id,
        teamId: cloudSuiteTeam._id.toString(),
        projectId: cloudSuiteProject._id.toString(),
        updates: [
          {
            date: new Date("2025-01-23"),
            note: "Completed UI mockups and started React component development",
            updatedBy: nimali._id,
          },
          {
            date: new Date("2025-01-20"),
            note: "Implemented main dashboard layout and integrated Chart.js for data visualization",
            updatedBy: nimali._id,
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
        reporterId: pradeep._id,
        teamId: cloudSuiteTeam._id.toString(),
        projectId: cloudSuiteProject._id.toString(),
        updates: [
          {
            date: new Date("2025-01-19"),
            note: "Completed all translations and tested language switching functionality",
            updatedBy: dilini._id,
          },
          {
            date: new Date("2025-01-08"),
            note: "Set up react-i18next and created translation files for Sinhala and Tamil",
            updatedBy: dilini._id,
          },
        ],
      },
      {
        title: "Optimize CloudSuite Report Generation Performance",
        summary: "Improve report generation speed for large datasets",
        description: "Optimize SQL queries and implement caching for CloudSuite report generation. Target 50% reduction in report generation time for datasets over 100K records.",
        assigneeId: tharindu._id,
        status: "TODO",
        priority: "High",
        startDate: new Date("2025-02-01"),
        dueDate: new Date("2025-02-22"),
        reporterId: pradeep._id,
        teamId: cloudSuiteTeam._id.toString(),
        projectId: cloudSuiteProject._id.toString(),
      },
      {
        title: "Fix Critical Security Vulnerability in Authentication Module",
        summary: "Patch SQL injection vulnerability in login endpoint",
        description: "Fix critical SQL injection vulnerability discovered in CloudSuite authentication module. Implement parameterized queries and add input validation.",
        assigneeId: kasun._id,
        status: "DONE",
        priority: "High",
        startDate: new Date("2025-01-10"),
        dueDate: new Date("2025-01-15"),
        reporterId: pradeep._id,
        teamId: cloudSuiteTeam._id.toString(),
        projectId: cloudSuiteProject._id.toString(),
        updates: [
          {
            date: new Date("2025-01-14"),
            note: "Implemented parameterized queries and added comprehensive input validation. Passed security audit",
            updatedBy: kasun._id,
          },
        ],
      },
      
      // Infrastructure Team Tasks
      {
        title: "Migrate Production Database to AWS RDS",
        summary: "Move on-premise PostgreSQL to AWS RDS",
        description: "Plan and execute migration of production PostgreSQL database to AWS RDS. Ensure zero downtime and data integrity. Set up automated backups and monitoring.",
        assigneeId: lakshan._id,
        status: "IN_PROGRESS",
        priority: "High",
        startDate: new Date("2025-01-15"),
        dueDate: new Date("2025-02-10"),
        reporterId: ruwanD._id,
        teamId: infraTeam._id.toString(),
        projectId: infraProject._id.toString(),
        updates: [
          {
            date: new Date("2025-01-22"),
            note: "Completed RDS instance setup and tested database replication. Planning cutover for next week",
            updatedBy: lakshan._id,
          },
        ],
      },
      {
        title: "Set Up Kubernetes Cluster on EKS",
        summary: "Deploy production-ready EKS cluster",
        description: "Configure AWS EKS cluster for microservices deployment. Include auto-scaling, load balancing, and monitoring with Prometheus and Grafana.",
        assigneeId: nadeeka._id,
        status: "IN_PROGRESS",
        priority: "High",
        startDate: new Date("2025-01-20"),
        dueDate: new Date("2025-02-15"),
        reporterId: ruwanD._id,
        teamId: infraTeam._id.toString(),
        projectId: infraProject._id.toString(),
        updates: [
          {
            date: new Date("2025-01-24"),
            note: "EKS cluster deployed with 3 worker nodes. Configured Prometheus and Grafana for monitoring",
            updatedBy: nadeeka._id,
          },
        ],
      },
      {
        title: "Implement CI/CD Pipeline with GitHub Actions",
        summary: "Automate build, test, and deployment process",
        description: "Set up CI/CD pipeline using GitHub Actions for automated testing and deployment to AWS. Include staging and production environments with approval gates.",
        assigneeId: lakshan._id,
        status: "TODO",
        priority: "Medium",
        startDate: new Date("2025-02-05"),
        dueDate: new Date("2025-02-25"),
        reporterId: ruwanD._id,
        teamId: infraTeam._id.toString(),
        projectId: infraProject._id.toString(),
      },
    ]);

    console.log(`Created ${tasks.length} tasks`);

    // Create Subtasks
    await TaskModel.create([
      {
        title: "Design Field Property Panel UI",
        summary: "Create property editor for form field configuration",
        description: "Design and implement property panel for configuring field attributes, validation rules, and styling",
        assigneeId: dilini._id,
        status: "DONE",
        priority: "High",
        startDate: new Date("2025-01-15"),
        dueDate: new Date("2025-01-20"),
        reporterId: dilini._id,
        teamId: appXpressTeam._id.toString(),
        parentTaskId: tasks[0]._id.toString(),
        isSubtask: true,
        completedAt: new Date("2025-01-20"),
      },
      {
        title: "Implement Field Drag-and-Drop Logic",
        summary: "Add drag-and-drop functionality for form fields",
        description: "Implement drag-and-drop using react-beautiful-dnd library",
        assigneeId: dilini._id,
        status: "DONE",
        priority: "High",
        startDate: new Date("2025-01-20"),
        dueDate: new Date("2025-01-23"),
        reporterId: dilini._id,
        teamId: appXpressTeam._id.toString(),
        parentTaskId: tasks[0]._id.toString(),
        isSubtask: true,
        completedAt: new Date("2025-01-23"),
      },
      {
        title: "Add Real-Time Form Preview",
        summary: "Show live preview of form as user builds it",
        description: "Implement real-time preview panel showing form as end-users will see it",
        assigneeId: thilini._id,
        status: "IN_PROGRESS",
        priority: "High",
        startDate: new Date("2025-01-23"),
        dueDate: new Date("2025-01-28"),
        reporterId: dilini._id,
        teamId: appXpressTeam._id.toString(),
        parentTaskId: tasks[0]._id.toString(),
        isSubtask: true,
      },
    ]);

    console.log("Created subtasks");

    // Create Help Request
    await AssignRequestModel.create([
      {
        taskId: tasks[3]._id,
        requesterId: chaminda._id,
        teamId: appXpressTeam._id.toString(),
        suggestedMemberIds: [kasun._id, tharindu._id],
        note: "Need help coordinating with infrastructure team to expedite Redis cluster setup. Kasun and Tharindu have experience with similar infrastructure requests.",
        status: "pending",
      },
    ]);

    console.log("Created help request");

    console.log("\n✅ Seed completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`- Users: ${users.length}`);
    console.log(`- Teams: 3 (AppXpress, CloudSuite Industrial, Infrastructure)`);
    console.log(`- Projects: 5`);
    console.log(`- Tasks: ${tasks.length}`);
    console.log(`- Subtasks: 3`);
    console.log(`- Help Requests: 1`);
    console.log("\n🔐 Login Credentials (password: password123):");
    console.log("Lead (AppXpress): rajitha.fernando@infor.com");
    console.log("Member (AppXpress): savindu.amalka@infor.com (Development Intern)");
    console.log("Member (AppXpress): kasun.perera@infor.com");
    console.log("Lead (CloudSuite): pradeep.gunasekara@infor.com");
    console.log("Lead (Infrastructure): ruwan.dissanayake@infor.com");

    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
}

seed();
