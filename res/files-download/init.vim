:set number 
:set relativenumber
:set autoindent 
:set tabstop=2 
:set shiftwidth=2
:set smarttab
:set softtabstop
:set mouse=a

call plug#begin()

Plug 'https://github.com/vim-airline/vim-airline.git'
Plug 'https://github.com/preservim/nerdtree.git'

call plug#end()

nnoremap <C-n> :NERDTree<CR>
nnoremap <C-t> :NERDTreeToggle<CR>

