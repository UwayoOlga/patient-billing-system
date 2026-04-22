using HospitalBilling.Data;
using HospitalBilling.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;

namespace HospitalBilling.Scratch
{
    public class DumpStaff
    {
        public static void Run(AppDbContext db)
        {
            var staff = db.Staff.ToList();
            Console.WriteLine("ID | FullName | Email | Role | IsActive");
            Console.WriteLine("---------------------------------------");
            foreach (var s in staff)
            {
                Console.WriteLine($"{s.Id} | {s.FullName} | {s.Email} | {s.Role} | {s.IsActive}");
            }
        }
    }
}
