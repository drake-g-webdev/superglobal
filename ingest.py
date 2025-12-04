import os
import glob
from langchain_community.document_loaders import UnstructuredMarkdownLoader
from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
import argparse
import logging
from dotenv import load_dotenv

# Load env vars
load_dotenv(os.path.join(os.path.dirname(__file__), ".env.local"))

# Configure logging
logging.basicConfig(level=logging.INFO)

DATA_DIR = "../data"
DB_DIR = "./vector_store"

def load_documents(data_dir):
    """Loads all markdown files from the data directory."""
    documents = []
    files = glob.glob(os.path.join(data_dir, "**/*.md"), recursive=True)
    logging.info(f"Found {len(files)} markdown files.")
    
    for file_path in files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Extract metadata from path
            # Path: ../data/Continent/Country/City/Title.md
            parts = file_path.split(os.sep)
            # Find index of 'data' to anchor
            try:
                data_idx = parts.index("data")
                location_parts = parts[data_idx+1:-1]
                location = " > ".join(location_parts)
            except ValueError:
                location = "Unknown"

            doc = Document(
                page_content=content,
                metadata={
                    "source": file_path,
                    "location": location,
                    "title": os.path.splitext(os.path.basename(file_path))[0]
                }
            )
            documents.append(doc)
        except Exception as e:
            logging.error(f"Error loading {file_path}: {e}")
            
    return documents

def split_documents(documents):
    """Splits documents into chunks."""
    
    # 1. Split by Headers first to keep logical sections together
    headers_to_split_on = [
        ("#", "Header 1"),
        ("##", "Header 2"),
        ("###", "Header 3"),
    ]
    markdown_splitter = MarkdownHeaderTextSplitter(headers_to_split_on=headers_to_split_on)
    
    all_splits = []
    for doc in documents:
        splits = markdown_splitter.split_text(doc.page_content)
        for split in splits:
            # Merge metadata
            split.metadata.update(doc.metadata)
            all_splits.append(split)
            
    # 2. Further split large chunks if necessary
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    final_splits = text_splitter.split_documents(all_splits)
    
    logging.info(f"Split {len(documents)} documents into {len(final_splits)} chunks.")
    return final_splits

def create_vector_store(splits):
    """Creates and saves the vector store."""
    if not splits:
        logging.warning("No splits to ingest.")
        return

    # Using OpenAI Embeddings (requires OPENAI_API_KEY env var)
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    
    vectorstore = Chroma.from_documents(
        documents=splits,
        embedding=embeddings,
        persist_directory=DB_DIR
    )
    logging.info(f"Vector store created at {DB_DIR}")

def main():
    parser = argparse.ArgumentParser(description="Ingest content into Vector Store")
    parser.add_argument("--limit", type=int, help="Limit number of files for testing")
    args = parser.parse_args()
    
    if not os.environ.get("OPENAI_API_KEY"):
        logging.error("OPENAI_API_KEY environment variable not set.")
        return

    docs = load_documents(DATA_DIR)
    if args.limit:
        docs = docs[:args.limit]
        
    splits = split_documents(docs)
    create_vector_store(splits)

if __name__ == "__main__":
    main()
