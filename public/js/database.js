/**
 * ProfDash - Database Abstraction Layer
 * Handles data persistence with Supabase (primary) and localStorage (fallback)
 */

class DashboardDB {
    constructor() {
        this.supabase = null;
        this.isConnected = false;
        this.userId = null;
    }

    // Initialize Supabase client
    async init() {
        if (!window.SUPABASE_CONFIG ||
            window.SUPABASE_CONFIG.url === 'YOUR_SUPABASE_URL') {
            console.warn('Supabase not configured. Using localStorage fallback.');
            return false;
        }

        try {
            const { createClient } = supabase;
            this.supabase = createClient(
                window.SUPABASE_CONFIG.url,
                window.SUPABASE_CONFIG.anonKey
            );

            // Check for existing session
            const { data: { session } } = await this.supabase.auth.getSession();
            if (session) {
                this.userId = session.user.id;
                this.isConnected = true;
                console.log('Connected to Supabase as user:', this.userId);
            } else {
                console.log('Supabase initialized, but no user session. Using localStorage.');
            }

            return this.isConnected;
        } catch (error) {
            console.error('Failed to connect to Supabase:', error);
            return false;
        }
    }

    // ==================== AUTHENTICATION ====================

    async signUp(email, password) {
        if (!this.supabase) return { error: 'Supabase not initialized' };

        const { data, error } = await this.supabase.auth.signUp({
            email,
            password
        });

        if (!error && data.user) {
            this.userId = data.user.id;
            this.isConnected = true;
        }

        return { data, error };
    }

    async signIn(email, password) {
        if (!this.supabase) return { error: 'Supabase not initialized' };

        const { data, error } = await this.supabase.auth.signInWithPassword({
            email,
            password
        });

        if (!error && data.user) {
            this.userId = data.user.id;
            this.isConnected = true;
        }

        return { data, error };
    }

    async signOut() {
        if (!this.supabase) return;

        await this.supabase.auth.signOut();
        this.userId = null;
        this.isConnected = false;
    }

    async getCurrentUser() {
        if (!this.supabase) return null;

        const { data: { user } } = await this.supabase.auth.getUser();
        return user;
    }

    // ==================== TASKS ====================

    async getTasks() {
        if (!this.isConnected) {
            try {
                return JSON.parse(localStorage.getItem('profdash-tasks') || '[]');
            } catch (e) {
                console.error('Error parsing tasks from localStorage:', e);
                return [];
            }
        }

        const { data, error } = await this.supabase
            .from('tasks')
            .select('*')
            .eq('user_id', this.userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching tasks:', error);
            return [];
        }

        return data;
    }

    async saveTask(task) {
        if (!this.isConnected) {
            try {
                const tasks = JSON.parse(localStorage.getItem('profdash-tasks') || '[]');
                const index = tasks.findIndex(t => t.id === task.id);
                if (index !== -1) {
                    tasks[index] = task;
                } else {
                    tasks.push(task);
                }
                localStorage.setItem('profdash-tasks', JSON.stringify(tasks));
                return task;
            } catch (e) {
                console.error('Error saving task to localStorage:', e);
                return null;
            }
        }

        const { data, error } = await this.supabase
            .from('tasks')
            .upsert({
                ...task,
                user_id: this.userId,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('Error saving task:', error);
            return null;
        }
        return data;
    }

    async deleteTask(taskId) {
        if (!this.isConnected) {
            try {
                const tasks = JSON.parse(localStorage.getItem('profdash-tasks') || '[]');
                const filtered = tasks.filter(t => t.id !== taskId);
                localStorage.setItem('profdash-tasks', JSON.stringify(filtered));
                return true;
            } catch (e) {
                console.error('Error deleting task from localStorage:', e);
                return false;
            }
        }

        const { error } = await this.supabase
            .from('tasks')
            .delete()
            .eq('id', taskId)
            .eq('user_id', this.userId);

        if (error) {
            console.error('Error deleting task:', error);
            return false;
        }
        return true;
    }

    // ==================== PAPERS ====================

    async getPapers() {
        if (!this.isConnected) {
            try {
                return JSON.parse(localStorage.getItem('profdash-papers') || '[]');
            } catch (e) {
                return [];
            }
        }

        const { data, error } = await this.supabase
            .from('papers')
            .select('*')
            .eq('user_id', this.userId)
            .order('last_update', { ascending: false });

        if (error) {
            console.error('Error fetching papers:', error);
            return [];
        }

        return data;
    }

    async savePaper(paper) {
        if (!this.isConnected) {
            try {
                const papers = JSON.parse(localStorage.getItem('profdash-papers') || '[]');
                const index = papers.findIndex(p => p.id === paper.id);
                if (index !== -1) {
                    papers[index] = paper;
                } else {
                    papers.push(paper);
                }
                localStorage.setItem('profdash-papers', JSON.stringify(papers));
                return paper;
            } catch (e) {
                return null;
            }
        }

        const { data, error } = await this.supabase
            .from('papers')
            .upsert({
                ...paper,
                user_id: this.userId,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('Error saving paper:', error);
            return null;
        }
        return data;
    }

    async deletePaper(paperId) {
        if (!this.isConnected) {
            try {
                const papers = JSON.parse(localStorage.getItem('profdash-papers') || '[]');
                const filtered = papers.filter(p => p.id !== paperId);
                localStorage.setItem('profdash-papers', JSON.stringify(filtered));
                return true;
            } catch (e) {
                return false;
            }
        }

        const { error } = await this.supabase
            .from('papers')
            .delete()
            .eq('id', paperId)
            .eq('user_id', this.userId);

        return !error;
    }

    // ==================== GRANTS ====================

    async getGrants() {
        if (!this.isConnected) {
            try {
                return JSON.parse(localStorage.getItem('profdash-grants') || '[]');
            } catch (e) {
                return [];
            }
        }

        const { data, error } = await this.supabase
            .from('grants')
            .select('*')
            .eq('user_id', this.userId)
            .order('end_date', { ascending: true });

        if (error) {
            console.error('Error fetching grants:', error);
            return [];
        }

        return data;
    }

    async saveGrant(grant) {
        if (!this.isConnected) {
            try {
                const grants = JSON.parse(localStorage.getItem('profdash-grants') || '[]');
                const index = grants.findIndex(g => g.id === grant.id);
                if (index !== -1) {
                    grants[index] = grant;
                } else {
                    grants.push(grant);
                }
                localStorage.setItem('profdash-grants', JSON.stringify(grants));
                return grant;
            } catch (e) {
                return null;
            }
        }

        const { data, error } = await this.supabase
            .from('grants')
            .upsert({
                ...grant,
                user_id: this.userId,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('Error saving grant:', error);
            return null;
        }
        return data;
    }

    async deleteGrant(grantId) {
        if (!this.isConnected) {
            try {
                const grants = JSON.parse(localStorage.getItem('profdash-grants') || '[]');
                const filtered = grants.filter(g => g.id !== grantId);
                localStorage.setItem('profdash-grants', JSON.stringify(filtered));
                return true;
            } catch (e) {
                return false;
            }
        }

        const { error } = await this.supabase
            .from('grants')
            .delete()
            .eq('id', grantId)
            .eq('user_id', this.userId);

        return !error;
    }

    // ==================== PERSONNEL ====================

    async getPersonnel() {
        if (!this.isConnected) {
            try {
                return JSON.parse(localStorage.getItem('profdash-personnel') || '[]');
            } catch (e) {
                return [];
            }
        }

        const { data, error } = await this.supabase
            .from('personnel')
            .select('*')
            .eq('user_id', this.userId)
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching personnel:', error);
            return [];
        }

        return data;
    }

    async savePersonnel(person) {
        if (!this.isConnected) {
            try {
                const personnel = JSON.parse(localStorage.getItem('profdash-personnel') || '[]');
                const index = personnel.findIndex(p => p.id === person.id);
                if (index !== -1) {
                    personnel[index] = person;
                } else {
                    personnel.push(person);
                }
                localStorage.setItem('profdash-personnel', JSON.stringify(personnel));
                return person;
            } catch (e) {
                return null;
            }
        }

        const { data, error } = await this.supabase
            .from('personnel')
            .upsert({
                ...person,
                user_id: this.userId,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('Error saving personnel:', error);
            return null;
        }
        return data;
    }

    async deletePersonnel(personId) {
        if (!this.isConnected) {
            try {
                const personnel = JSON.parse(localStorage.getItem('profdash-personnel') || '[]');
                const filtered = personnel.filter(p => p.id !== personId);
                localStorage.setItem('profdash-personnel', JSON.stringify(filtered));
                return true;
            } catch (e) {
                return false;
            }
        }

        const { error } = await this.supabase
            .from('personnel')
            .delete()
            .eq('id', personId)
            .eq('user_id', this.userId);

        return !error;
    }

    // ==================== COURSES ====================

    async getCourses() {
        if (!this.isConnected) {
            try {
                return JSON.parse(localStorage.getItem('profdash-courses') || '[]');
            } catch (e) {
                return [];
            }
        }

        const { data, error } = await this.supabase
            .from('courses')
            .select('*')
            .eq('user_id', this.userId)
            .order('quarter', { ascending: false });

        if (error) {
            console.error('Error fetching courses:', error);
            return [];
        }

        return data;
    }

    async saveCourse(course) {
        if (!this.isConnected) {
            try {
                const courses = JSON.parse(localStorage.getItem('profdash-courses') || '[]');
                const index = courses.findIndex(c => c.id === course.id);
                if (index !== -1) {
                    courses[index] = course;
                } else {
                    courses.push(course);
                }
                localStorage.setItem('profdash-courses', JSON.stringify(courses));
                return course;
            } catch (e) {
                return null;
            }
        }

        const { data, error } = await this.supabase
            .from('courses')
            .upsert({
                ...course,
                user_id: this.userId,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('Error saving course:', error);
            return null;
        }
        return data;
    }

    async deleteCourse(courseId) {
        if (!this.isConnected) {
            try {
                const courses = JSON.parse(localStorage.getItem('profdash-courses') || '[]');
                const filtered = courses.filter(c => c.id !== courseId);
                localStorage.setItem('profdash-courses', JSON.stringify(filtered));
                return true;
            } catch (e) {
                return false;
            }
        }

        const { error } = await this.supabase
            .from('courses')
            .delete()
            .eq('id', courseId)
            .eq('user_id', this.userId);

        return !error;
    }

    // ==================== SETTINGS ====================

    async getSetting(key) {
        if (!this.isConnected) {
            return localStorage.getItem('profdash-setting-' + key);
        }

        const { data, error } = await this.supabase
            .from('settings')
            .select('value')
            .eq('user_id', this.userId)
            .eq('key', key)
            .single();

        if (error) return null;
        return data?.value;
    }

    async setSetting(key, value) {
        if (!this.isConnected) {
            localStorage.setItem('profdash-setting-' + key, value);
            return true;
        }

        const { error } = await this.supabase
            .from('settings')
            .upsert({
                user_id: this.userId,
                key,
                value,
                updated_at: new Date().toISOString()
            });

        return !error;
    }
}

// Create global instance
window.dashboardDB = new DashboardDB();
