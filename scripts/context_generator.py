import os
from sys import argv
import traceback
import requests
from bs4 import BeautifulSoup
from inference_adapter import InferenceAdapter
import re

contextual_retrieval_prompt = """
    <document>
    {doc_content}
    </document>


    Here is the chunk we want to situate within the whole document
    <chunk>
    {chunk_content}
    </chunk>


    Please give a short succinct context to situate this chunk within the overall document for the purposes of improving search retrieval of the chunk.
    Answer only with the succinct context and nothing else.
    """

chunks = []
def scrape(url, depth, output):
    inference_adapter = InferenceAdapter()
    links = dict()
    links[url] = depth

    while len(links) > 0:
      print(len(links))
      link = next(iter(links))
      layer = links.pop(link)

      data = requests.get(link)
      soup = BeautifulSoup(data.content, 'html.parser')
      text = soup.get_text(separator=" ", strip=True)
      sentences = re.split(r'(?<=[.!?])\s+', text.strip())

      for sentence in sentences:
        prompt = contextual_retrieval_prompt.format(doc_content='\n'.join(chunks), chunk_content=sentence)
        response_stream = inference_adapter.invoke_model_with_response_stream(prompt)
        chunk_context = ''.join(chunk for chunk in response_stream if chunk)
        chunks.append(chunk_context)

      # add sublinks to scrape next
      if (layer > 0):
        for element in soup.find_all("a"):
          link = element.get("href")
          if (
            link and
            "mailto" not in link and
            ".com" not in link and
            link not in links
          ):
            if (link[0] == '/' or link[0] == '#'):
              links[f"{url}{link}"] = layer - 1
            else:
              links[link] = layer - 1

    with open(output, 'w') as f:
      f.write('\n'.join(chunks))

scrape(argv[1], argv[2], argv[3]);
