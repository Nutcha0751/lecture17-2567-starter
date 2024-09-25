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

  //search enrollments array for items with 'studentId' นักเรียนคนนี้ลงทะเบียนวิชาอะไรไปบ้าง
  const courseNoList = []
  for(const enroll of DB.enrollments){ //วน loop ใน DB.enrollments แล้วดึงออกมาทีละตัว จากนั้นเก็บไว้ในตัวแปร enroll
    if(enroll.studentId === studentId){ //enroll.studentId มีค่าเท่ากับ studentId ที่ดึงมาจาก parseResult ไหม
      courseNoList.push(enroll.courseNo) //ถ้าเท่ากันแสดงว่าเจอข้อมูล แล้วเก็บไว้ใน array courseNoList
    }
  }

  //given each found courseNo, search courses DB for items with 'courseNo' เอารหัสวิชาไป search courses DB ต่อ ถ้าพบ item course ก็เอามาแสดง
  const courses = []
  for(const courseNo of courseNoList){ //ดึงรหัสแต่ละตัวจาก array ในขั้นตอนก่อนหน้าออกมา
      //found: found_course = { courseNo: "261207", title: "..."} หาแล้วเจอ
      //found: found_course = undefined หาแล้วไม่เจอ
      const found_course = DB.courses.find((c) => c.courseNo === courseNo) //courseNo คือข้อมูลขั้นตอนก่อนหน้า

      //กรณีหาไม่เจอ
      if(!found_course) return NextResponse.json({ //found_course เฉยๆ เป็น false
        ok: false,
        message: `Oops! Something went wrong`, //data base ผิด มีรหัสที่ไม่มีอยู่จริงใน data base
      }, { status: 500 })
      
      //กรณีหาเจอ
      courses.push(found_course) //courses ที่ลงคือวิชาอะไร ให้เก็บไว้
  }

  return NextResponse.json({
    ok: true,
    courses: courses, //ข้างหน้าเป็นชื่อ key ข้างหลังเป็น value
  });
};

export const POST = async (request:NextRequest) => {
  //check if 'studentId' is present in DB เป็นรหัสนักศึกษาที่มีอยู่ในระบบ
  //check if 'courseNo' is present in DB วิชาที่จะลงอยู่ใน data base
  //check if the enrollment { studentId and courseNo } is not present in DB โดยที่ enrollment ประกอบด้วย studentId และ courseNo ยังไม่มีใน data base ถ้ามีแล้วไม่ควรจะลงอีกได้

  const body = await request.json(); //เป็นการดึง data ออกมาจากส่วน request (ดึงข้อมูลออกมาเก็บไว้ในส่วน bady)
  const parseResult = zEnrollmentPostBody.safeParse(body); //ตรวจว่า zEnrollmentPostBody ถูกตามที่ต้องไหม
  if (parseResult.success === false) {
    return NextResponse.json(
      {
        ok: false,
        message: parseResult.error.issues[0].message,
      },
      { status: 400 } //bad request (ส่งข้อมูลมาไม่ครบ)
    );
  }

  const { studentId, courseNo } = body; //ใน body มีข้อมูล 2 ตัว คือ studentId, courseNo โดยจะดึงออกมาทีละตัวมาเป็บไว้ในข้อมูลที่ 2

  const found_student = DB.students.find((s) => s.studentId === studentId); //ถ้าค้นพบ, studentId ที่รับมาตรงกับ studentId ที่มีอยู่ไหม
  const found_course = DB.courses.find((c) => c.courseNo === courseNo);

  if(!found_student || !found_course){ //กรณีหาไม่เจอ
    return NextResponse.json({
      ok: false,
      message: "Student or Course is not found",
    }, { status: 400 })
  }

  const found_enroll = DB.enrollments.find((enroll) => enroll.courseNo === courseNo && enroll.studentId === studentId);
  if(found_enroll){ //กรณีลงทะเบียนไปอยู่ก่อนแล้ว
    return NextResponse.json({
      ok: false,
      message: "Student has already enrolled that course",
    }, { status: 400 })
  }

  //กรณียังไม่เคยลงทะเบียน
  DB.enrollments.push({studentId, courseNo});

  return NextResponse.json({
    ok: true,
    message: "Student has enrolled course", //ลงทะเบียนสำเร็จ
  });
};
