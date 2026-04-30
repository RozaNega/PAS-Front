import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-calendar-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar-widget.component.html',
  styleUrls: ['./calendar-widget.component.scss']
})
export class CalendarWidgetComponent implements OnInit {
  currentDate: Date = new Date();
  
  // Time properties
  hours: string = '';
  minutes: string = '';
  seconds: string = '';
  ampm: string = '';
  
  // Date properties
  dayName: string = '';
  date: string = '';
  month: string = '';
  year: string = '';
  
  // Week days
  weekDays: { day: string; date: string; isToday: boolean; isCurrentMonth: boolean }[] = [];
  
  private timeInterval: any;

  ngOnInit(): void {
    this.updateTime();
    this.updateDate();
    this.generateCalendar();
    this.timeInterval = setInterval(() => {
      this.updateTime();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
  }

  private updateTime(): void {
    this.currentDate = new Date();
    let hours = this.currentDate.getHours();
    const minutes = this.currentDate.getMinutes();
    const seconds = this.currentDate.getSeconds();
    
    this.ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    
    this.hours = hours.toString().padStart(2, '0');
    this.minutes = minutes.toString().padStart(2, '0');
    this.seconds = seconds.toString().padStart(2, '0');
  }

  private updateDate(): void {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    
    this.dayName = days[this.currentDate.getDay()];
    this.date = this.currentDate.getDate().toString();
    this.month = months[this.currentDate.getMonth()];
    this.year = this.currentDate.getFullYear().toString();
  }

  private generateCalendar(): void {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const startDay = firstDay.getDay();
    const totalDays = lastDay.getDate();
    
    const prevMonthLastDay = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    
    this.weekDays = [];
    
    // Previous month days
    for (let i = startDay - 1; i >= 0; i--) {
      this.weekDays.push({
        day: '',
        date: (prevMonthLastDay - i).toString(),
        isToday: false,
        isCurrentMonth: false
      });
    }
    
    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      this.weekDays.push({
        day: '',
        date: i.toString(),
        isToday: i === today.getDate(),
        isCurrentMonth: true
      });
    }
    
    // Next month days
    const remainingDays = 42 - this.weekDays.length;
    for (let i = 1; i <= remainingDays; i++) {
      this.weekDays.push({
        day: '',
        date: i.toString(),
        isToday: false,
        isCurrentMonth: false
      });
    }
  }
}
