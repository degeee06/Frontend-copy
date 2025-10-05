class CopyCraftPro {
    constructor() {
        this.favorites = JSON.parse(localStorage.getItem('copycraftFavorites')) || [];
        this.currentTemplate = null;
        
        // ⭐⭐ NOVO: Configuração do Supabase Auth
        this.supabaseUrl = 'https://xwhjsrtekupveprdvuei.supabase.co'; // SUA URL DO SUPABASE
        this.supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3aGpzcnRla3VwdmVwcmR2dWVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2OTA1NTgsImV4cCI6MjA3NTI2NjU1OH0.L7TjEi-6j8tWu-nCRsypISFjKpWDQO0r4_aykXo33VQ'; // SUA CHAVE ANON DO SUPABASE
        this.supabase = window.supabase.createClient(this.supabaseUrl, this.supabaseAnonKey);
        
        this.user = null;
        this.init();
    }

    async init() { // ⭐⭐ Adicionar async
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
    
    // ⭐⭐ CORREÇÃO: Aguardar o checkAuthState terminar
    await this.checkAuthState(); // ⭐⭐ Adicionar await
    
    this.initializeEventListeners();
    await this.loadFavorites(); // ⭐⭐ Adicionar await
}

       async checkAuthState() {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (user) {
            this.user = user;
            this.updateAuthUI();
            console.log('✅ Usuário logado:', user.email);
            
            // ⭐⭐ INICIAR TRIAL AUTOMATICAMENTE
            try {
                const trial = await this.startTrial();
                if (trial) {
                    console.log('🎉 Trial ativado para usuário');
                }
            } catch (error) {
                console.error('❌ Erro ao iniciar trial:', error);
            }
        } else {
            console.log('❌ Usuário não logado');
            this.user = null;
            this.favorites = [];
            this.updateAuthUI();
        }
    }

   async loginWithGoogle() {
    const loginButton = document.getElementById('loginButton');
    const originalText = loginButton.innerHTML;
    
    // Loading state
    loginButton.innerHTML = '<i data-feather="loader" class="animate-spin w-4 h-4 mr-2"></i>Conectando...';
    loginButton.disabled = true;
    feather.replace();

    try {
        const { data, error } = await this.supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: 'https://frontend-copy-ten.vercel.app'
            }
        });
        
        if (error) throw error;
        
    } catch (error) {
        console.error('Erro no login:', error);
        alert('Erro ao fazer login com Google');
        
        // Restore button
        loginButton.innerHTML = originalText;
        loginButton.disabled = false;
        feather.replace();
    }
}
   async logout() {
    const { error } = await this.supabase.auth.signOut();
    if (error) {
        console.error('Erro no logout:', error);
    } else {
        this.user = null;
        this.favorites = []; // ⭐⭐ LIMPA os favoritos ao deslogar
        this.updateAuthUI();
        // Opcional: redirecionar para home
        window.location.href = 'index.html';
    }
}

        updateAuthUI() {
        const loginButton = document.getElementById('loginButton');
        if (!loginButton) return;

        if (this.user) {
            const userName = this.user.user_metadata.full_name || this.user.email;
            loginButton.innerHTML = `
                <img src="${this.user.user_metadata.avatar_url || ''}" 
                     class="w-6 h-6 rounded-full mr-2" 
                     onerror="this.style.display='none'">
                <span class="hidden sm:inline">${userName.split(' ')[0]}</span>
                <span class="bg-green-500 text-white text-xs px-2 py-1 rounded-full ml-2" id="trialBadge">
                    🎯 Trial
                </span>
            `;
            loginButton.title = `Sair (${userName})`;
            
            // ⭐⭐ ATUALIZAR BADGE COM DIAS RESTANTES
            this.updateTrialBadge();
        } else {
            loginButton.innerHTML = `
                <i data-feather="log-in" class="w-4 h-4 mr-2"></i>
                Login com Google
            `;
            feather.replace();
        }
    }

    async updateTrialBadge() {
        const trialBadge = document.getElementById('trialBadge');
        if (!trialBadge) return;
        
        const trialStatus = await this.checkTrialStatus();
        if (trialStatus.hasTrial) {
            trialBadge.textContent = `🎯 ${trialStatus.daysLeft}d`;
            trialBadge.className = 'bg-green-500 text-white text-xs px-2 py-1 rounded-full ml-2';
        } else {
            trialBadge.textContent = '💔 Expirado';
            trialBadge.className = 'bg-red-500 text-white text-xs px-2 py-1 rounded-full ml-2';
        }
    }

    
   initializeEventListeners() {
    // Template generation form
    const generateForm = document.getElementById('generateForm');
    if (generateForm) {
        generateForm.addEventListener('submit', (e) => this.generateContent(e));
    }

    // Tone selection
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('tone-option')) {
            this.selectTone(e);
        }
    });

    // Copy and favorite buttons
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-copy') || e.target.closest('.btn-copy')) {
            this.copyToClipboard(e);
        }
        
        if (e.target.classList.contains('btn-favorite') || e.target.closest('.btn-favorite')) {
            this.toggleFavorite(e);
        }
    });

    // Template selection
    const templateCards = document.querySelectorAll('.template-card');
    templateCards.forEach(card => {
        card.addEventListener('click', (e) => this.selectTemplate(e));
    }); // ⭐⭐ FECHAR o forEach

    // ⭐⭐ NOVO: Listener para o botão de login
    const loginButton = document.getElementById('loginButton');
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            if (this.user) {
                this.logout();
            } else {
                this.loginWithGoogle();
            }
        });
    }
} // ⭐⭐ FECHAR o método initializeEventListeners


    // ⭐⭐ MÉTODOS SUPABASE PARA FAVORITOS
async saveFavoritesToSupabase() {
    if (!this.user) return;
    
    try {
        const { data, error } = await this.supabase
            .from('user_favorites')
            .upsert({
                user_id: this.user.id,
                favorites: this.favorites,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            });
            
        if (error) throw error;
        console.log('✅ Favoritos salvos no Supabase');
    } catch (error) {
        console.error('❌ Erro ao salvar favoritos:', error);
    }
}

async loadFavoritesFromSupabase() {
    // ⭐⭐ CORREÇÃO: Sempre limpa os favoritos se não está logado
    if (!this.user) {
        this.favorites = []; // ⭐⭐ LIMPA os favoritos
        return;
    }
    
    try {
        const { data, error } = await this.supabase
            .from('user_favorites')
            .select('favorites')
            .eq('user_id', this.user.id)
            .single();
            
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no data
        
        if (data && data.favorites) {
            this.favorites = data.favorites;
            console.log('✅ Favoritos carregados do Supabase');
        } else {
            this.favorites = []; // ⭐⭐ Se não tem dados, array vazio
        }
    } catch (error) {
        console.error('❌ Erro ao carregar favoritos:', error);
        this.favorites = []; // ⭐⭐ Em caso de erro, array vazio
    }
}

    // ⭐⭐ MÉTODOS PARA TRIAL GRATUITO
    async startTrial() {
        if (!this.user) return;
        
        try {
            const { data, error } = await this.supabase
                .from('user_trials')
                .insert([{ user_id: this.user.id }])
                .select()
                .single();
                
            if (error) throw error;
            console.log('✅ Trial iniciado:', data);
            return data;
        } catch (error) {
            console.error('❌ Erro ao iniciar trial:', error);
            // Se já existe um trial, apenas retorna sucesso
            if (error.code === '23505') { // Unique violation
                return await this.getUserTrial();
            }
            throw error;
        }
    }

        async getUserTrial() {
        if (!this.user) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('user_trials')
                .select('*')
                .eq('user_id', this.user.id)
                .maybeSingle(); // ⭐⭐ MUDEI PARA maybeSingle()
                
            if (error) {
                console.error('❌ Erro ao buscar trial:', error);
                return null;
            }
            
            console.log('📊 Trial encontrado:', data);
            return data;
        } catch (error) {
            console.error('❌ Erro ao buscar trial:', error);
            return null;
        }
    }


    
             async checkTrialStatus() {
        try {
            const trial = await this.getUserTrial();
            
            if (!trial) {
                console.log('❌ Nenhum trial encontrado para o usuário');
                return { hasTrial: false, message: 'Sem trial ativo' };
            }
            
            console.log('📅 Trial data:', trial);
            
            const now = new Date();
            const endsAt = new Date(trial.ends_at);
            
            // ⭐⭐ CORREÇÃO: Comparação simples e direta
            const isTrialActive = endsAt > now;
            const timeDiff = endsAt.getTime() - now.getTime();
            const daysLeft = Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
            
            console.log('📊 Trial status:', {
                now: now.toISOString(),
                endsAt: endsAt.toISOString(), 
                isTrialActive: isTrialActive,
                daysLeft: daysLeft
            });
            
            if (!isTrialActive) {
                return { 
                    hasTrial: false, 
                    message: 'Trial expirado',
                    daysLeft: 0
                };
            }
            
            return {
                hasTrial: true,
                message: `${daysLeft} dias restantes`,
                daysLeft: daysLeft,
                trialData: trial
            };
            
        } catch (error) {
            console.error('❌ Erro ao verificar status do trial:', error);
            return { hasTrial: false, message: 'Erro ao verificar trial' };
        }
    }

    async updateTrialBadge() {
        const trialBadge = document.getElementById('trialBadge');
        if (!trialBadge) return;
        
        console.log('🔄 Atualizando badge do trial...');
        const trialStatus = await this.checkTrialStatus();
        console.log('🎯 Status do trial:', trialStatus);
        
        if (trialStatus.hasTrial) {
            trialBadge.textContent = `🎯 ${trialStatus.daysLeft}d`;
            trialBadge.className = 'bg-green-500 text-white text-xs px-2 py-1 rounded-full ml-2';
        } else {
            trialBadge.textContent = '💔 Expirado';
            trialBadge.className = 'bg-red-500 text-white text-xs px-2 py-1 rounded-full ml-2';
        }
    }

    
    
selectTemplate(e) {
    const card = e.currentTarget;
    const templateType = card.dataset.template;
    
    document.querySelectorAll('.template-card').forEach(c => {
        c.classList.remove('border-purple-500', 'border-2', 'bg-purple-50');
    });
    
    card.classList.add('border-purple-500', 'border-2', 'bg-purple-50');
    this.currentTemplate = templateType;
    this.updateTemplateForm(templateType);
    
    // ⭐⭐ CORREÇÃO: MOSTRAR O FORMULÁRIO ⭐⭐
    const formSection = document.getElementById('templateFormSection');
    const formTitle = document.getElementById('templateFormTitle');
    
    if (formSection) {
        formSection.style.display = 'block';
        
        // Atualizar o título do formulário
        if (formTitle) {
            const templateNames = {
                instagram: 'Legendas para Instagram',
                facebook: 'Anúncios para Facebook', 
                ecommerce: 'Descrições de Produto',
                email: 'E-mails de Marketing',
                google: 'Anúncios para Google',
                blog: 'Títulos para Blog'
            };
            formTitle.textContent = `Configurar ${templateNames[templateType]}`;
        }
        
        // Scroll suave para o formulário
        setTimeout(() => {
            formSection.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }, 100);
    }
}

updateTemplateForm(templateType) {
    const formContainer = document.getElementById('templateFormContainer');
    if (!formContainer) return;

    const forms = {
        instagram: this.getInstagramForm(),
        facebook: this.getFacebookForm(),
        ecommerce: this.getEcommerceForm(),
        email: this.getEmailForm(),
        google: this.getGoogleForm(),
        blog: this.getBlogForm()
    };

    formContainer.innerHTML = forms[templateType] || forms.instagram;
    feather.replace();
}

    getInstagramForm() {
        return `
            <div class="space-y-6">
                <div>
                    <label class="block text-gray-700 mb-2 font-medium">Descrição do Post</label>
                    <textarea id="contentInput" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent" 
                              placeholder="Descreva o que você quer postar, produto, serviço ou ideia..." rows="3" required></textarea>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-gray-700 mb-2 font-medium">Estilo</label>
                        <select id="styleSelect" class="w-full p-3 border border-gray-300 rounded-lg">
                            <option value="engajamento">Engajamento</option>
                            <option value="venda">Venda</option>
                            <option value="educativo">Educativo</option>
                            <option value="divertido">Divertido</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-gray-700 mb-2 font-medium">Tom de Voz</label>
                        <div class="flex flex-wrap gap-2" id="toneSelector">
                            <span class="tone-option bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm cursor-pointer" data-tone="descontraido">Descontraído</span>
                            <span class="tone-option bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm cursor-pointer" data-tone="formal">Formal</span>
                            <span class="tone-option bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm cursor-pointer" data-tone="inspirador">Inspirador</span>
                        </div>
                    </div>
                </div>
                <button type="submit" class="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition duration-300 flex items-center justify-center">
                    <i data-feather="zap" class="w-4 h-4 mr-2"></i>
                    Gerar Legendas com IA
                </button>
            </div>
        `;
    }

    getFacebookForm() {
        return `
            <div class="space-y-6">
                <div>
                    <label class="block text-gray-700 mb-2 font-medium">Produto/Serviço</label>
                    <input type="text" id="contentInput" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent" 
                           placeholder="Descreva o que você está anunciando..." required>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2 font-medium">Público-Alvo</label>
                    <input type="text" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent" 
                           placeholder="Ex: Mulheres 25-40 anos, interessadas em fitness">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-gray-700 mb-2 font-medium">Objetivo</label>
                        <select id="styleSelect" class="w-full p-3 border border-gray-300 rounded-lg">
                            <option value="vendas">Vendas</option>
                            <option value="leads">Leads</option>
                            <option value="trafico">Tráfego</option>
                            <option value="engajamento">Engajamento</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-gray-700 mb-2 font-medium">Tom de Voz</label>
                        <div class="flex flex-wrap gap-2" id="toneSelector">
                            <span class="tone-option bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm cursor-pointer" data-tone="persuasivo">Persuasivo</span>
                            <span class="tone-option bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm cursor-pointer" data-tone="urgente">Urgente</span>
                            <span class="tone-option bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm cursor-pointer" data-tone="profissional">Profissional</span>
                        </div>
                    </div>
                </div>
                <button type="submit" class="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition duration-300 flex items-center justify-center">
                    <i data-feather="zap" class="w-4 h-4 mr-2"></i>
                    Gerar Anúncio com IA
                </button>
            </div>
        `;
    }

    getEcommerceForm() {
        return `
            <div class="space-y-6">
                <div>
                    <label class="block text-gray-700 mb-2 font-medium">Nome do Produto</label>
                    <input type="text" id="contentInput" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent" 
                           placeholder="Nome do produto..." required>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2 font-medium">Características Principais</label>
                    <textarea class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent" 
                              placeholder="Liste as principais características e benefícios..." rows="3"></textarea>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-gray-700 mb-2 font-medium">Preço</label>
                        <input type="text" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent" 
                               placeholder="R$ 99,90">
                    </div>
                    <div>
                        <label class="block text-gray-700 mb-2 font-medium">Tom de Voz</label>
                        <div class="flex flex-wrap gap-2" id="toneSelector">
                            <span class="tone-option bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm cursor-pointer" data-tone="descritivo">Descritivo</span>
                            <span class="tone-option bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm cursor-pointer" data-tone="persuasivo">Persuasivo</span>
                            <span class="tone-option bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm cursor-pointer" data-tone="tecnico">Técnico</span>
                        </div>
                    </div>
                </div>
                <button type="submit" class="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition duration-300 flex items-center justify-center">
                    <i data-feather="zap" class="w-4 h-4 mr-2"></i>
                    Gerar Descrição com IA
                </button>
            </div>
        `;
    }

    getEmailForm() {
        return `
            <div class="space-y-6">
                <div>
                    <label class="block text-gray-700 mb-2 font-medium">Assunto do Email</label>
                    <input type="text" id="contentInput" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent" 
                           placeholder="Qual o propósito deste email?" required>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2 font-medium">Mensagem Principal</label>
                    <textarea class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent" 
                              placeholder="Descreva a mensagem que quer transmitir..." rows="3"></textarea>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-gray-700 mb-2 font-medium">Tipo de Email</label>
                        <select id="styleSelect" class="w-full p-3 border border-gray-300 rounded-lg">
                            <option value="vendas">Vendas</option>
                            <option value="boas-vindas">Boas-vindas</option>
                            <option value="nutricao">Nutrição</option>
                            <option value="promocional">Promocional</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-gray-700 mb-2 font-medium">Tom de Voz</label>
                        <div class="flex flex-wrap gap-2" id="toneSelector">
                            <span class="tone-option bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm cursor-pointer" data-tone="formal">Formal</span>
                            <span class="tone-option bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm cursor-pointer" data-tone="amigavel">Amigável</span>
                            <span class="tone-option bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm cursor-pointer" data-tone="empolgado">Empolgado</span>
                        </div>
                    </div>
                </div>
                <button type="submit" class="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition duration-300 flex items-center justify-center">
                    <i data-feather="zap" class="w-4 h-4 mr-2"></i>
                    Gerar Email com IA
                </button>
            </div>
        `;
    }

    getGoogleForm() {
        return `
            <div class="space-y-6">
                <div>
                    <label class="block text-gray-700 mb-2 font-medium">Produto/Serviço</label>
                    <input type="text" id="contentInput" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent" 
                           placeholder="O que você está anunciando?" required>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2 font-medium">Palavras-chave</label>
                    <input type="text" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent" 
                           placeholder="Ex: marketing digital, curso online, ecommerce">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-gray-700 mb-2 font-medium">Tipo de Anúncio</label>
                        <select id="styleSelect" class="w-full p-3 border border-gray-300 rounded-lg">
                            <option value="pesquisa">Pesquisa</option>
                            <option value="display">Display</option>
                            <option value="shopping">Shopping</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-gray-700 mb-2 font-medium">Tom de Voz</label>
                        <div class="flex flex-wrap gap-2" id="toneSelector">
                            <span class="tone-option bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm cursor-pointer" data-tone="direto">Direto</span>
                            <span class="tone-option bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm cursor-pointer" data-tone="urgente">Urgente</span>
                            <span class="tone-option bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm cursor-pointer" data-tone="informativo">Informativo</span>
                        </div>
                    </div>
                </div>
                <button type="submit" class="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition duration-300 flex items-center justify-center">
                    <i data-feather="zap" class="w-4 h-4 mr-2"></i>
                    Gerar Anúncio com IA
                </button>
            </div>
        `;
    }

    getBlogForm() {
        return `
            <div class="space-y-6">
                <div>
                    <label class="block text-gray-700 mb-2 font-medium">Tópico do Blog Post</label>
                    <input type="text" id="contentInput" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent" 
                           placeholder="Sobre o que é o post?" required>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2 font-medium">Ângulo/Abordagem</label>
                    <textarea class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent" 
                              placeholder="Qual a abordagem? Tutorial, lista, opinião..." rows="2"></textarea>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-gray-700 mb-2 font-medium">Formato</label>
                        <select id="styleSelect" class="w-full p-3 border border-gray-300 rounded-lg">
                            <option value="lista">Lista</option>
                            <option value="guia">Guia</option>
                            <option value="opiniao">Opinião</option>
                            <option value="noticia">Notícia</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-gray-700 mb-2 font-medium">Tom de Voz</label>
                        <div class="flex flex-wrap gap-2" id="toneSelector">
                            <span class="tone-option bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm cursor-pointer" data-tone="autoridade">Autoridade</span>
                            <span class="tone-option bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm cursor-pointer" data-tone="conversacional">Conversacional</span>
                            <span class="tone-option bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm cursor-pointer" data-tone="educativo">Educativo</span>
                        </div>
                    </div>
                </div>
                <button type="submit" class="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition duration-300 flex items-center justify-center">
                    <i data-feather="zap" class="w-4 h-4 mr-2"></i>
                    Gerar Títulos com IA
                </button>
            </div>
        `;
    }

    selectTone(e) {
        const toneOption = e.target;
        const container = toneOption.closest('#toneSelector');
        
        // Remove active class from all options in the same container
        container.querySelectorAll('.tone-option').forEach(opt => {
            opt.classList.remove('bg-purple-100', 'text-purple-800');
            opt.classList.add('bg-gray-100', 'text-gray-800');
        });
        
        // Add active class to selected option
        toneOption.classList.remove('bg-gray-100', 'text-gray-800');
        toneOption.classList.add('bg-purple-100', 'text-purple-800');
    }

           async generateContent(e) {
        e.preventDefault();
        
        // ⭐⭐ VERIFICAR SE USUÁRIO ESTÁ LOGADO (ESTOU FALTANDO!)
        if (!this.user) {
            alert('⚠️ Faça login para gerar conteúdos!');
            this.loginWithGoogle();
            return;
        }
        
        // ⭐⭐ VERIFICAR SE TEM TRIAL ATIVO
        const trialStatus = await this.checkTrialStatus();
        if (!trialStatus.hasTrial) {
            this.showTrialExpiredModal(trialStatus);
            return;
        }

        if (!this.currentTemplate) {
            alert('Por favor, selecione um template primeiro.');
            return;
        }

        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        submitBtn.innerHTML = '<i data-feather="loader" class="animate-spin inline w-4 h-4 mr-2"></i>Gerando com IA...';
        submitBtn.disabled = true;
        feather.replace();

        try {
            const content = await this.callDeepSeekAPI();
            this.displayGeneratedContent(content);
        } catch (error) {
            console.error('Error generating content:', error);
            alert('Erro ao gerar conteúdo. Verifique sua API Key e tente novamente.');
            const sampleContent = this.generateSampleContent();
            this.displayGeneratedContent(sampleContent);
        }

        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        feather.replace();
    }

       // ⭐⭐ MODAL DE TRIAL EXPIRADO
    showTrialExpiredModal(trialStatus) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white p-8 rounded-2xl max-w-md w-full mx-4 text-center">
                <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i data-feather="clock" class="text-yellow-600 w-8 h-8"></i>
                </div>
                <h3 class="text-2xl font-bold text-gray-800 mb-4">Trial Expirado</h3>
                <p class="text-gray-600 mb-6">
                    Seu período de teste de 7 dias acabou. 
                    Assine agora para continuar gerando conteúdos incríveis!
                </p>
                <div class="space-y-3">
                    <button onclick="copyCraft.upgradeToPro()" 
                            class="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-all">
                        🚀 Assinar Agora - R$ 29,90/mês
                    </button>
                    <button onclick="this.closest('.fixed').remove()" 
                            class="w-full border border-gray-300 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 transition-all">
                        Talvez depois
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        feather.replace();
    }

   // ⭐⭐ MÉTODO PARA UPGRADE (placeholder)
    upgradeToPro() {
        // Aqui você integraria com um gateway de pagamento
        alert('Redirecionando para página de assinatura...');
        // Ex: window.location.href = '/checkout.html';
    }
    
    
   async callDeepSeekAPI() {
    const contentInput = document.getElementById('contentInput');
    const styleSelect = document.getElementById('styleSelect');
    const toneSelector = document.getElementById('toneSelector');
    
    const userInput = contentInput ? contentInput.value : '';
    const style = styleSelect ? styleSelect.value : 'engajamento';
    const activeTone = toneSelector ? toneSelector.querySelector('.bg-purple-100') : null;
    const tone = activeTone ? activeTone.dataset.tone : 'descontraido';

    const prompt = this.buildPrompt(userInput, style, tone);

    // ⭐⭐ MUDANÇA AQUI: Chama SEU backend em vez da API diretamente ⭐⭐
    const response = await fetch('https://backend-copy-1e16.onrender.com/api/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            prompt: prompt,
            template: this.currentTemplate
        })
    });

    if (!response.ok) {
        throw new Error(`Backend Error: ${response.status}`);
    }

    const data = await response.json();
    return data.content;
}

    buildPrompt(userInput, style, tone) {
        const templatePrompts = {
            instagram: `Gere 3 opções de legenda para Instagram sobre: "${userInput}"
Estilo: ${style}
Tom de voz: ${tone}

Formato desejado:
1. [Legenda com emojis e hashtags]
2. [Legenda com emojis e hashtags] 
3. [Legenda com emojis e hashtags]

Inclua hashtags relevantes no final de cada opção.`,

            facebook: `Gere um anúncio para Facebook Ads sobre: "${userInput}"
Estilo: ${style} 
Tom de voz: ${tone}

Formato desejado:
Título: [Título impactante]
Texto: [Texto persuasivo com CTA]
CTA: [Chamada para ação]`,

            ecommerce: `Gere uma descrição de produto para e-commerce sobre: "${userInput}"
Estilo: ${style}
Tom de voz: ${tone}

Formato desejado:
Título: [Título atrativo]
Descrição: [Descrição detalhada com benefícios]
Características: [Lista de características principais]`,

            email: `Gere um email de marketing sobre: "${userInput}"
Estilo: ${style}
Tom de voz: ${tone}

Formato desejado:
Assunto: [Assunto persuasivo]
Corpo: [Texto do email com saudação, conteúdo principal e CTA]`,

            google: `Gere um anúncio para Google Ads sobre: "${userInput}"
Estilo: ${style}
Tom de voz: ${tone}

Formato desejado:
Título 1: [Título principal]
Título 2: [Título secundário]
Descrição: [Descrição persuasiva]
Path: [categoria/produto]`,

            blog: `Gere 5 títulos atraentes para blog post sobre: "${userInput}"
Estilo: ${style}
Tom de voz: ${tone}

Formato desejado:
1. [Título atraente]
2. [Título atraente]
3. [Título atraente]
4. [Título atraente]
5. [Título atraente]`
        };

        return templatePrompts[this.currentTemplate] || templatePrompts.instagram;
    }

    generateSampleContent() {
        const samples = {
            instagram: `1. ✨ Descubra o poder do nosso produto! Transforme sua rotina com resultados incríveis 🚀\n\n👉 Experimente agora e veja a diferença!\n\n#ProdutoIncrível #Resultados #Inovação\n\n2. 🤔 Procurando uma solução eficaz? Nosso produto foi desenvolvido para oferecer o máximo em performance e qualidade!\n\n💬 Conte pra gente nos comentários!\n\n#Solução #Qualidade #Performance\n\n3. 🎉 Chegou a hora de revolucionar seu dia a dia! Com nosso produto, você alcança objetivos de forma simples e eficiente.\n\n👉 Garanta o seu com condições especiais!\n\n#Revolução #Simplicidade #Oportunidade`,
            facebook: `Título: Transforme Sua Realidade Com Nosso Produto!\n\nTexto: Descubra como nosso produto pode revolucionar sua experiência. Desenvolvido com tecnologia de ponta para oferecer resultados excepcionais. Milhares de clientes satisfeitos!\n\nCTA: Saiba Mais Agora!`,
            ecommerce: `Título: Produto Premium - Excelência em Cada Detalhe\n\nDescrição: Experimente a diferença com nosso produto de alta qualidade. Desenvolvido com materiais duráveis e design inovador, oferece performance superior e durabilidade incomparável.\n\nCaracterísticas:\n• Alta performance e eficiência\n• Design premium e moderno\n• Fácil de usar e manter\n• Garantia de satisfação`,
            email: `Assunto: Oportunidade Exclusiva Para Você!\n\nCorpo: Prezado cliente,\n\nTemos uma novidade incrível para compartilhar! Nosso produto foi desenvolvido para oferecer a melhor experiência e resultados excepcionais.\n\nNão perca esta oportunidade única de transformar sua rotina.\n\nAtenciosamente,\nEquipe CopyCraft`,
            google: `Título 1: Produto Revolucionário\nTítulo 2: Resultados Comprovados\nDescrição: Descubra a excelência com nosso produto premium. Tecnologia avançada e qualidade superior. Experimente a diferença!\nPath: produtos/destaque`,
            blog: `1. 10 Maneiras Incríveis de Utilizar Nosso Produto no Dia a Dia\n2. O Guia Definitivo Para Maximizar Seus Resultados\n3. Como Nosso Produto Pode Transformar Sua Rotina\n4. Os Segredos Por Trás do Sucesso do Nosso Produto\n5. Por Que Milhares de Pessoas Escolhem Nossa Solução`
        };

        return samples[this.currentTemplate] || samples.instagram;
    }

    displayGeneratedContent(content) {
        const resultsContainer = document.getElementById('generatedContent');
        if (!resultsContainer) return;

        resultsContainer.innerHTML = `
            <div class="bg-white rounded-lg shadow-md p-6 fade-in">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-gray-800">Conteúdo Gerado</h3>
                    <span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center">
                        <i data-feather="check-circle" class="w-4 h-4 mr-1"></i>
                        IA
                    </span>
                </div>
                <div class="bg-gray-50 p-4 rounded-lg mb-4 whitespace-pre-line text-gray-700">
                    ${content}
                </div>
                <div class="flex space-x-3">
                    <button class="btn-copy flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-purple-700 transition duration-300 flex items-center justify-center" data-content="${content.replace(/"/g, '&quot;')}">
                        <i data-feather="copy" class="w-4 h-4 mr-2"></i>
                        Copiar
                    </button>
                    <button class="btn-favorite flex-1 border border-purple-600 text-purple-600 py-2 px-4 rounded-lg font-medium hover:bg-purple-50 transition duration-300 flex items-center justify-center" data-content="${content.replace(/"/g, '&quot;')}" data-type="${this.currentTemplate}">
                        <i data-feather="heart" class="w-4 h-4 mr-2"></i>
                        Favoritar
                    </button>
                </div>
            </div>
        `;
        feather.replace();
    }

    copyToClipboard(e) {
        const button = e.target.classList.contains('btn-copy') ? e.target : e.target.closest('.btn-copy');
        const content = button.dataset.content;
        
        navigator.clipboard.writeText(content).then(() => {
            // Visual feedback
            const originalText = button.innerHTML;
            button.innerHTML = '<i data-feather="check" class="w-4 h-4 mr-2"></i>Copiado!';
            button.classList.remove('bg-purple-600');
            button.classList.add('bg-green-600');
            
            setTimeout(() => {
                button.innerHTML = originalText;
                button.classList.remove('bg-green-600');
                button.classList.add('bg-purple-600');
                feather.replace();
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
            alert('Erro ao copiar para a área de transferência.');
        });
    }

   async toggleFavorite(e) { // ⭐⭐ Adicionar async
    const button = e.target.classList.contains('btn-favorite') ? e.target : e.target.closest('.btn-favorite');
    const content = button.dataset.content;
    const type = button.dataset.type;
    
    // Verificar se usuário está logado
    if (!this.user) {
        alert('⚠️ Faça login para salvar favoritos!');
        this.loginWithGoogle();
        return;
    }
    
    const favorite = {
        id: Date.now(),
        type: type,
        content: content,
        date: new Date().toLocaleDateString('pt-BR'),
        title: this.generateFavoriteTitle(content),
        user_id: this.user.id
    };
    
    this.favorites.push(favorite);
    
    // ⭐⭐ CORREÇÃO: Aguardar o saveFavorites terminar
    await this.saveFavorites(); // ⭐⭐ Adicionar await
    
    // ⭐⭐ CORREÇÃO: Atualizar a visualização APÓS salvar
    this.loadFavorites();
    
    // Visual feedback
    const originalText = button.innerHTML;
    button.innerHTML = '<i data-feather="heart" class="w-4 h-4 mr-2 fill-current"></i>Salvo!';
    button.classList.remove('border-purple-600', 'text-purple-600');
    button.classList.add('bg-green-500', 'border-green-500', 'text-white');
    
    setTimeout(() => {
        button.innerHTML = originalText;
        button.classList.remove('bg-green-500', 'border-green-500', 'text-white');
        button.classList.add('border-purple-600', 'text-purple-600');
        feather.replace();
    }, 2000);
}

    generateFavoriteTitle(content) {
        const firstLine = content.split('\n')[0];
        return firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
    }

   async saveFavorites() { // ⭐⭐ Adicionar async
    // ⭐⭐ CORREÇÃO: Só salva no Supabase se estiver logado e AGUARDA
    if (this.user) {
        await this.saveFavoritesToSupabase(); // ⭐⭐ Adicionar await
    }
}

    
// ⭐⭐ MÉTODO NOVO: Ordenar favoritos
sortFavorites(favorites, sortBy) {
    const sortedFavorites = [...favorites]; // Cria uma cópia
    
    switch (sortBy) {
        case 'newest':
            return sortedFavorites.sort((a, b) => b.id - a.id); // Mais recentes primeiro
        case 'oldest':
            return sortedFavorites.sort((a, b) => a.id - b.id); // Mais antigos primeiro
        case 'name':
            return sortedFavorites.sort((a, b) => a.title.localeCompare(b.title)); // Ordem alfabética
        default:
            return sortedFavorites;
    }
}

    
    
 async loadFavorites() {
    console.log('🔄 Carregando favoritos...', 'Usuário:', this.user ? this.user.email : 'Não logado');
    
    await this.loadFavoritesFromSupabase();
    
    const favoritesGrid = document.getElementById('favoritesGrid');
    if (!favoritesGrid) return;

    // ⭐⭐ CORREÇÃO: Obter filtro e ordenação selecionados
    const filterType = document.getElementById('filterType') ? document.getElementById('filterType').value : 'all';
    const sortBy = document.getElementById('sortBy') ? document.getElementById('sortBy').value : 'newest';
    
    console.log('📊 Filtro:', filterType, 'Ordenação:', sortBy);

    // ⭐⭐ CORREÇÃO: Filtrar favoritos pelo tipo selecionado
    let filteredFavorites = this.favorites;
    
    if (filterType !== 'all') {
        filteredFavorites = this.favorites.filter(fav => fav.type === filterType);
    }
    
    console.log('📊 Favoritos após filtro:', filteredFavorites.length);

    // ⭐⭐ CORREÇÃO: Ordenar favoritos
    filteredFavorites = this.sortFavorites(filteredFavorites, sortBy);

    if (filteredFavorites.length === 0) {
        favoritesGrid.innerHTML = `
            <div class="col-span-3 text-center py-12">
                <i data-feather="heart" class="w-16 h-16 text-gray-300 mx-auto mb-4"></i>
                <h3 class="text-xl font-bold text-gray-500 mb-2">
                    ${filterType === 'all' ? 'Nenhum favorito ainda' : `Nenhum favorito do tipo ${this.getTypeLabel(filterType)}`}
                </h3>
                <p class="text-gray-400">
                    ${filterType === 'all' 
                        ? 'Gere alguns conteúdos e adicione-os aos favoritos!' 
                        : `Gere conteúdos do tipo ${this.getTypeLabel(filterType)} e adicione-os aos favoritos!`}
                </p>
            </div>
        `;
        feather.replace();
        return;
    }

    // ⭐⭐ CORREÇÃO: Usar filteredFavorites em vez de this.favorites
    favoritesGrid.innerHTML = filteredFavorites.map(fav => `
        <div class="copy-card bg-white p-6 rounded-lg shadow-sm border border-gray-100 transition duration-300">
            <div class="flex justify-between items-start mb-4">
                <div class="flex items-center">
                    <div class="w-10 h-10 ${this.getTypeColor(fav.type)} rounded-full flex items-center justify-center mr-3">
                        <i data-feather="${this.getTypeIcon(fav.type)}" class="${this.getTypeIconColor(fav.type)} w-5 h-5"></i>
                    </div>
                    <div>
                        <h3 class="font-bold">${this.getTypeLabel(fav.type)}</h3>
                        <p class="text-sm text-gray-500">${fav.date}</p>
                    </div>
                </div>
                <button class="text-gray-400 hover:text-red-500 delete-favorite" data-id="${fav.id}">
                    <i data-feather="trash-2" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg mb-4 max-h-32 overflow-y-auto">
                <p class="text-gray-700 whitespace-pre-line">${fav.content}</p>
            </div>
            <div class="flex justify-between items-center text-sm">
                <span class="bg-purple-100 text-purple-800 px-2 py-1 rounded">${fav.type}</span>
                <button class="btn-copy text-purple-600 hover:text-purple-800 font-medium" data-content="${fav.content.replace(/"/g, '&quot;')}">
                    Copiar
                </button>
            </div>
        </div>
    `).join('');

    feather.replace();

    // Add event listeners for delete buttons
    document.querySelectorAll('.delete-favorite').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.dataset.id);
            this.deleteFavorite(id);
        });
    });
}
    deleteFavorite(id) {
        this.favorites = this.favorites.filter(fav => fav.id !== id);
        this.saveFavorites();
        this.loadFavorites();
    }

    getTypeColor(type) {
        const colors = {
            instagram: 'bg-pink-100',
            facebook: 'bg-blue-100',
            ecommerce: 'bg-green-100',
            email: 'bg-red-100',
            google: 'bg-blue-100',
            blog: 'bg-yellow-100'
        };
        return colors[type] || 'bg-gray-100';
    }

    getTypeIcon(type) {
        const icons = {
            instagram: 'instagram',
            facebook: 'facebook',
            ecommerce: 'shopping-cart',
            email: 'mail',
            google: 'dollar-sign',
            blog: 'file-text'
        };
        return icons[type] || 'file-text';
    }

    getTypeIconColor(type) {
        const colors = {
            instagram: 'text-pink-600',
            facebook: 'text-blue-600',
            ecommerce: 'text-green-600',
            email: 'text-red-600',
            google: 'text-blue-600',
            blog: 'text-yellow-600'
        };
        return colors[type] || 'text-gray-600';
    }

    getTypeLabel(type) {
        const labels = {
            instagram: 'Legenda Instagram',
            facebook: 'Anúncio Facebook',
            ecommerce: 'Descrição Produto',
            email: 'Email Marketing',
            google: 'Anúncio Google',
            blog: 'Título Blog'
        };
        return labels[type] || 'Conteúdo';
    }
}


// ✅ DEIXE APENAS ESTE:
// Initialize the application
const copyCraft = new CopyCraftPro();

// Utility function to show/hide sections
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update navigation
    document.querySelectorAll('nav a').forEach(link => {
        link.classList.remove('font-medium');
    });
    
    // Update active link
    if (event && event.target) {
        event.target.classList.add('font-medium');
    }
}

// Make functions globally available
window.showSection = showSection;
window.copyCraft = copyCraft;





















