import { zEnrollmentGetParam, zEnrollmentPostBody } from "@lib/schema";
import { NextRequest, NextResponse } from "next/server";

import { DB } from "@lib/DB";

export const GET = async (request:NextRequest) => {
  const studentId = request.nextUrl.searchParams.get("studentId"); //GET studentId เข้ามา

  //validate input
  const parseResult = zEnrollmentGetParam.safeParse({
    studentId,
  });
  if (parseResult.success === false) {
    return NextResponse.json(
      {
        ok: false,
        message: parseResult.error.issues[0].message,
      },
      { status: 400 }
    );
  }

  //search enrollments array for items with 'studentId'
  const courseNoList = []
  for(const enroll of DB.enrollments){
    if(enroll.studentId === studentId){
      courseNoList.push(enroll.courseNo)
    }
  }

  //given each found courseNo, search courses DB for items with 'courseNo'
  const courses = []
  for(const courseNo of courseNoList){
      //found: found_course = { courseNo: "261207", title: "..."}
      //found: found_course = undefined
      const found_course = DB.courses.find((c) => c.courseNo === courseNo)

      if(!found_course) return NextResponse.json({
        ok: false,
        message: `Oops! Something went wrong`,
      }, { status: 500 })
      
      courses.push(found_course)
  }

  return NextResponse.json({
    ok: true,
    courses: courses,
  });
};

export const POST = async (request:NextRequest) => {
  //check if 'studentId' is present in DB
  //check if 'courseNo' is present in DB
  //check if the enrollment { studentId and courseNo } is not present in DB

  const body = await request.json();
  const parseResult = zEnrollmentPostBody.safeParse(body);
  if (parseResult.success === false) {
    return NextResponse.json(
      {
        ok: false,
        message: parseResult.error.issues[0].message,
      },
      { status: 400 } //bad request (ส่งข้อมูลมาไม่ครบ)
    );
  }

  const { studentId, courseNo } = body;

  const found_student = DB.students.find((s) => s.studentId === studentId);
  const found_course = DB.courses.find((c) => c.courseNo === courseNo);

  if(!found_student || !found_course){
    return NextResponse.json({
      ok: false,
      message: "Student or Course is not found",
    }, { status: 400 })
  }

  const found_enroll = DB.enrollments.find((enroll) => enroll.courseNo === courseNo && enroll.studentId === studentId);
  if(found_enroll){ //กรณีลงทะเบียนไปแล้ว
    return NextResponse.json({
      ok: false,
      message: "Student has already enrolled that course",
    }, { status: 400 })
  }

  DB.enrollments.push({studentId, courseNo});

  return NextResponse.json({
    ok: true,
    message: "Student has enrolled course", //ลงทะเบียนสำเร็จ
  });
};
