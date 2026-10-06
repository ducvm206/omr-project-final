// General use
async function request(
    url,
    method = "GET",
    body = null,
    headers = {}
) {
    const response = await fetch(`http://localhost:8001${url}`, {
        method,
        credentials: "include",
        headers: {
            ...(body ? { "Content-Type": "application/json" } : {}),
            ...headers
        },
        body: body ? JSON.stringify(body) : undefined
    });

    console.log("Status:", response.status);

    const contentType = response.headers.get("content-type");
    const data = contentType?.includes("application/json")
        ? await response.json()
        : await response.text();

    console.log("Response:", data);

    return {
        status: response.status,
        data
    };
}

// Request for a login
request("/api/login", "POST", {
    userName: "minhduc02",
    password: "vuminhduc"
});

// Request for creating template
request("/api/templates/create", "POST", {
    name: "Test 1",
    mcqQuestions: 20,
    writtenQuestions: 5,
    hasKeyArea: true,
    hasStudentIdArea: true
});

// Create new course
request("/api/courses/create", "POST", {
    name: "Course 1",
    academicYear: "2026-2027",
    description: "Course 1"
});



// Create new student
request("api/students/create", "POST", {
    id: "",
    name: "Student 1",
});


request("/api/courses/1/enroll/20201234", "POST", {
    courseId: 1,
    studentId: "20201234",
});

// Exam extraction template
request(
    "/api/exams/create",
    "POST",
    {
        mode: "extraction",
        name: "Physics Midterm - Single Key",
        courseId: 1,
        templateId: 6,
        numberOfKeys: 1,
        mcqPoints: 4,
        writtenPoints: 6,
        gradeAThreshold: 90.0,
        gradeBThreshold: 80.0,
        gradeCThreshold: 70.0,
        gradeDThreshold: 60.0,
        keyAFile: {
            bytes: "",
        },
    });

request("/api/grade", "POST", {
    examId: 7,
    partial: true,
    answerSheet: {
        bytes: "",
    }
});

request("/api/courses/1", "GET");