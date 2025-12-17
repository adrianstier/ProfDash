"use client";

import { useState } from "react";
import { Plus, GraduationCap, MoreHorizontal, Users, Calendar, Clock } from "lucide-react";

interface Course {
  id: string;
  code: string;
  title: string;
  semester: string;
  year: number;
  enrollment: number;
  schedule: string;
  location: string;
  status: "active" | "upcoming" | "completed";
}

// Mock data
const mockCourses: Course[] = [
  {
    id: "1",
    code: "CS 101",
    title: "Introduction to Computer Science",
    semester: "Fall",
    year: 2024,
    enrollment: 120,
    schedule: "MWF 10:00-10:50am",
    location: "Room 100",
    status: "active",
  },
  {
    id: "2",
    code: "CS 540",
    title: "Machine Learning",
    semester: "Fall",
    year: 2024,
    enrollment: 45,
    schedule: "TTh 2:00-3:15pm",
    location: "Room 250",
    status: "active",
  },
  {
    id: "3",
    code: "CS 790",
    title: "Advanced Topics in AI",
    semester: "Spring",
    year: 2025,
    enrollment: 15,
    schedule: "MW 4:00-5:15pm",
    location: "Seminar Room",
    status: "upcoming",
  },
];

const statusColors = {
  active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  upcoming: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  completed: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

export default function TeachingPage() {
  const [courses] = useState<Course[]>(mockCourses);
  const [filterStatus, setFilterStatus] = useState<Course["status"] | "all">("all");

  const filteredCourses = filterStatus === "all"
    ? courses
    : courses.filter(c => c.status === filterStatus);

  const activeCourses = courses.filter(c => c.status === "active");
  const totalStudents = activeCourses.reduce((sum, c) => sum + c.enrollment, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Teaching</h1>
          <p className="text-muted-foreground">
            Manage courses and office hours
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Add Course
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Active Courses</p>
          <p className="text-2xl font-bold">{activeCourses.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Students</p>
          <p className="text-2xl font-bold">{totalStudents}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Office Hours</p>
          <p className="text-2xl font-bold">4h/week</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Upcoming</p>
          <p className="text-2xl font-bold">
            {courses.filter(c => c.status === "upcoming").length}
          </p>
        </div>
      </div>

      {/* This Week's Schedule */}
      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 font-semibold">This Week&apos;s Teaching</h2>
        <div className="space-y-2">
          {activeCourses.map(course => (
            <div
              key={course.id}
              className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="font-medium">{course.code}</span>
                  <span className="mx-2 text-muted-foreground">-</span>
                  <span className="text-muted-foreground">{course.title}</span>
                </div>
              </div>
              <span className="text-sm text-muted-foreground">{course.schedule}</span>
            </div>
          ))}
          {activeCourses.length === 0 && (
            <p className="text-sm text-muted-foreground">No active courses</p>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(["all", "active", "upcoming", "completed"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`rounded-md px-3 py-1.5 text-sm capitalize ${
              filterStatus === status
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Course List */}
      <div className="space-y-3">
        {filteredCourses.map((course) => (
          <div
            key={course.id}
            className="group flex items-start gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
              <GraduationCap className="h-6 w-6 text-green-700 dark:text-green-300" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">
                    {course.code}: {course.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {course.semester} {course.year}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${statusColors[course.status]}`}>
                    {course.status}
                  </span>
                  <button className="opacity-0 group-hover:opacity-100">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {course.enrollment} students
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {course.schedule}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {course.location}
                </span>
              </div>
            </div>
          </div>
        ))}

        {filteredCourses.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <GraduationCap className="mb-4 h-12 w-12" />
            <p className="text-lg font-medium">No courses yet</p>
            <p className="text-sm">Add a course to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
